import test from "node:test";
import { request } from "node:http";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  exampleProject,
  newProject,
  projectSchema,
  publicProject,
  readiness,
  timing,
} from "../src/project.mjs";
import { buildFiles, siteHTML, calendar, posterPNG } from "../src/render.mjs";
import { Store } from "../src/store.mjs";
import { startServer } from "../src/server.mjs";

test("draft validation rejects unknown fields, executable links and traversal names", () => {
  const p = exampleProject();
  assert.throws(() => projectSchema.parse({ ...p, secret: "oops" }));
  assert.throws(() => projectSchema.parse({ ...p, repo: "../other" }));
  assert.throws(() =>
    projectSchema.parse({
      ...p,
      sources: [{ title: "X", url: "javascript:alert(1)" }],
    }),
  );
  assert.throws(() =>
    projectSchema.parse({
      ...p,
      sources: [{ title: "X", url: "https://user:password@example.org" }],
    }),
  );
  assert.ok(readiness(newProject()).includes("Protest title is missing."));
});
test("times use the event zone and reject skipped, ambiguous or inverted times", () => {
  const p = exampleProject();
  assert.equal(timing(p).start.toInstant().toString(), "2026-10-17T21:00:00Z");
  assert.throws(() => timing({ ...p, date: "2026-03-08", startTime: "02:30" }));
  assert.throws(() => timing({ ...p, date: "2026-11-01", startTime: "01:30" }));
  assert.throws(() => timing({ ...p, endTime: "13:00" }));
  assert.throws(() => timing({ ...p, timezone: "made-up" }));
});
test("unfinished sources can be saved but cannot be published", () => {
  const p = projectSchema.parse({
    ...exampleProject(),
    sources: [{ title: "Original report", url: "" }],
  });
  assert.ok(readiness(p).some((issue) => issue.includes("Source 1")));
  assert.throws(() =>
    projectSchema.parse({
      ...p,
      sources: [{ title: "Unsafe", url: "javascript:alert(1)" }],
    }),
  );
});
test("public exports exclude private notes, escape markup and contain real artifacts", async () => {
  const p = {
    ...exampleProject(),
    privateNotes: "PRIVATE_CANARY_8274",
    title: "A <script>alert(1)</script>",
    reason: "Text </script><script>alert(2)</script>",
  };
  assert.equal(publicProject(p).privateNotes, undefined);
  const { files } = await buildFiles(p, "https://organizer.github.io/event/");
  for (const [name, data] of Object.entries(files))
    assert.ok(!data.includes("PRIVATE_CANARY_8274"), name);
  assert.match(files["index.html"].toString(), /A &lt;script&gt;/);
  assert.ok(
    !files["index.html"].toString().includes("<script>alert(2)</script>"),
  );
  assert.equal(files["flier.pdf"].subarray(0, 4).toString(), "%PDF");
  assert.equal(files["social.png"].readUInt32BE(16), 1080);
  assert.equal(files["story.png"].readUInt32BE(20), 1920);
  assert.ok(files["flier.svg"].toString().includes("SCAN FOR DETAILS"));
  assert.ok(files["event.ics"].toString().includes("DTSTART:20261017T210000Z"));
  assert.ok(!files["index.html"].toString().includes("fonts.googleapis"));
});
test("calendar escapes injected lines and folds UTF8 safely", () => {
  const p = {
    ...exampleProject(),
    title: "Title\nBEGIN:BAD; one, two " + "é".repeat(50),
  };
  const value = calendar(p);
  assert.ok(value.includes("Title\\nBEGIN:BAD\\; one\\, two"));
  for (const line of value.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
  assert.ok(!value.includes("�"));
});
test("long poster text remains in bounded viewbox and status is present", async () => {
  const p = {
    ...exampleProject(),
    title: "W".repeat(100),
    demand: "A long request ".repeat(25),
    status: "cancelled",
    example: false,
    update: "Cancelled because of weather.",
  };
  const png = await posterPNG(
    p,
    "https://person.github.io/a-long-event-name/",
    "square",
  );
  assert.ok(png.length > 1000);
  const html = await siteHTML(p);
  assert.match(html, /CANCELLED/);
  assert.match(html, /EventCancelled/);
});
test("store serializes concurrent writes and preserves project IDs", async () => {
  const store = new Store(await mkdtemp(join(tmpdir(), "protest-store-")));
  const p = exampleProject();
  await Promise.all([
    store.save({ ...p, title: "first" }),
    store.save({ ...p, title: "second" }),
  ]);
  assert.equal((await store.project()).title, "second");
  assert.equal((await store.project()).id, p.id);
});
test("local API blocks cross origin writes, missing sessions and DNS rebinding", async () => {
  const app = await startServer({
    port: 0,
    dataDir: await mkdtemp(join(tmpdir(), "protest-http-")),
  });
  try {
    const session = await (await fetch(app.origin + "/api/session")).json();
    assert.equal(
      (
        await fetch(app.origin + "/api/project", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session.project),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(app.origin + "/api/project", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Protest-Session": session.csrf,
            Origin: "https://attacker.invalid",
          },
          body: JSON.stringify(session.project),
        })
      ).status,
      403,
    );
    assert.equal(
      await new Promise((resolve, reject) => {
        const req = request(
          app.origin + "/api/session",
          { headers: { Host: "attacker.invalid" } },
          (res) => {
            res.resume();
            resolve(res.statusCode);
          },
        );
        req.on("error", reject);
        req.end();
      }),
      403,
    );
    assert.equal(
      (
        await fetch(app.origin + "/api/project", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Protest-Session": session.csrf,
          },
          body: JSON.stringify({ ...session.project, title: "Saved test" }),
        })
      ).status,
      200,
    );
    assert.equal(
      (await (await fetch(app.origin + "/api/session")).json()).project.title,
      "Saved test",
    );
  } finally {
    app.server.closeAllConnections();
    await new Promise((r) => app.server.close(r));
  }
});

test("occupied ports report the real bind error instead of a null server address", async () => {
  const first = await startServer({
    port: 0,
    dataDir: await mkdtemp(join(tmpdir(), "protest-port-")),
  });
  try {
    await assert.rejects(
      startServer({
        port: first.server.address().port,
        dataDir: await mkdtemp(join(tmpdir(), "protest-port-")),
      }),
      { code: "EADDRINUSE" },
    );
  } finally {
    await new Promise((r) => first.server.close(r));
  }
});

test("cancelled and postponed calendar exports do not claim a confirmed event", () => {
  assert.ok(
    calendar({ ...exampleProject(), status: "cancelled" }).includes(
      "STATUS:CANCELLED",
    ),
  );
  assert.ok(
    calendar({ ...exampleProject(), status: "postponed" }).includes(
      "STATUS:TENTATIVE",
    ),
  );
});
