import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitHubPublisher } from "../src/github.mjs";
import { Store } from "../src/store.mjs";
import { exampleProject } from "../src/project.mjs";
import { artifactRevision } from "../src/render.mjs";
import { startServer } from "../src/server.mjs";
const missing = () => {
  const e = new Error("Not found");
  e.status = 404;
  throw e;
};
async function setup() {
  const store = new Store(await mkdtemp(join(tmpdir(), "protest-publish-"))),
    calls = [];
  let exists = false;
  const client = async (path, method = "GET", body) => {
    calls.push({ path, method, body });
    if (path === "user") return { login: "organizer" };
    if (path === "user/repos") {
      exists = true;
      return { default_branch: "main" };
    }
    if (path === "repos/organizer/library-gathering")
      return exists ? { private: false, default_branch: "main" } : missing();
    if (path.endsWith("/git/ref/heads/main"))
      return { object: { sha: "base" } };
    if (path.endsWith("/git/commits/base"))
      return { tree: { sha: "base-tree" } };
    if (path.endsWith("/git/blobs")) return { sha: "blob" };
    if (path.endsWith("/git/trees")) return { sha: "new-tree" };
    if (path.endsWith("/git/commits")) return { sha: "commit" };
    if (path.endsWith("/git/refs/heads/main")) return {};
    if (path.endsWith("/pages")) return method === "GET" ? missing() : {};
    throw new Error("Unexpected " + path);
  };
  return { pub: new GitHubPublisher(store, client), calls, store };
}
test("prepare is read only; publish writes only reviewed files and enables Pages", async () => {
  const { pub, calls, store } = await setup(),
    p = exampleProject();
  p.privateNotes = "NEVER_UPLOAD_THIS";
  const plan = await pub.prepare(p);
  assert.ok(calls.every((c) => c.method === "GET"));
  const d = await pub.publish(plan.planId, p);
  assert.equal(d.state, "building");
  assert.equal(d.commit, "commit");
  assert.ok(
    calls.some((c) => c.path.endsWith("/pages") && c.method === "POST"),
  );
  for (const c of calls.filter((c) => c.path.endsWith("/git/blobs")))
    assert.ok(
      !Buffer.from(c.body.content, "base64").includes("NEVER_UPLOAD_THIS"),
    );
  assert.equal((await store.read("deployment.json")).revision, plan.revision);
  await assert.rejects(pub.publish(plan.planId, p), /expired/);
});
test("publishing rejects changed drafts and expired approval without mutations", async () => {
  const { pub, calls } = await setup(),
    p = exampleProject(),
    plan = await pub.prepare(p);
  await assert.rejects(
    pub.publish(plan.planId, { ...p, title: "changed" }),
    /changed/,
  );
  assert.ok(calls.every((c) => c.method === "GET"));
  pub.plans.get(plan.planId).expires = 0;
  await assert.rejects(pub.publish(plan.planId, p), /expired/);
});
test("unrelated and private repositories are never taken over", async () => {
  const store = new Store(await mkdtemp(join(tmpdir(), "protest-collision-"))),
    p = exampleProject();
  for (const privateRepo of [false, true]) {
    const pub = new GitHubPublisher(store, async (path) => {
      if (path === "user") return { login: "organizer" };
      if (path.endsWith("/contents/protest-public.json")) return missing();
      return { private: privateRepo, default_branch: "main" };
    });
    await assert.rejects(
      pub.prepare(p),
      privateRepo ? /public event repositories/ : /another project/,
    );
  }
});

test("failed live verification disables QR downloads until the revision is verified again", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "protest-verification-"));
  const store = new Store(dir),
    p = exampleProject();
  await store.save(p);
  const revision = await artifactRevision(p);
  const deployment = {
    projectId: p.id,
    state: "live",
    revision,
    url: "https://organizer.github.io/fictional-event/",
    startedAt: Date.now(),
  };
  let outcome = "match";
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", (url, options) => {
    if (!String(url).startsWith(deployment.url))
      return originalFetch(url, options);
    if (outcome === "offline")
      return Promise.reject(new Error("Fixture outage"));
    return Promise.resolve(
      new Response(
        outcome === "match"
          ? `<meta name="protest-revision" content="${revision}">`
          : "Different deployed revision",
      ),
    );
  });
  const publisher = new GitHubPublisher(store, () =>
    assert.fail("No GitHub API calls expected"),
  );
  const app = await startServer({ port: 0, dataDir: dir, publisher });
  const downloadedSVG = async () =>
    (await fetch(app.origin + "/api/download/svg")).text();
  try {
    for (const failure of ["mismatch", "offline"]) {
      await store.write("deployment.json", deployment);
      assert.match(await downloadedSVG(), /SCAN FOR DETAILS/);
      outcome = failure;
      assert.equal((await publisher.status(p)).state, "building");
      assert.equal((await store.read("deployment.json")).state, "building");
      assert.doesNotMatch(await downloadedSVG(), /SCAN FOR DETAILS/);
      outcome = "match";
      assert.equal((await publisher.status(p)).state, "live");
      assert.match(await downloadedSVG(), /SCAN FOR DETAILS/);
    }
  } finally {
    app.server.closeAllConnections();
    await new Promise((resolve) => app.server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
