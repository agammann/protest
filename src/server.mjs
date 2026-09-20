import express from "express";
import { randomBytes } from "node:crypto";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import archiver from "archiver";
import { Store } from "./store.mjs";
import { ROOT } from "./paths.mjs";
import {
  projectSchema,
  newProject,
  exampleProject,
  readiness,
  guide,
  digest,
  publicProject,
} from "./project.mjs";
import { GitHubPublisher } from "./github.mjs";
import {
  posterSVG,
  posterPNG,
  posterPDF,
  siteHTML,
  buildFiles,
  artifactRevision,
} from "./render.mjs";

export async function startServer({
  port = Number(process.env.PROTEST_PORT || 4317),
  dataDir = process.env.PROTEST_DATA_DIR || join(ROOT, ".protest"),
  publisher,
} = {}) {
  const app = express(),
    store = new Store(dataDir),
    pub = publisher || new GitHubPublisher(store),
    csrf = randomBytes(32).toString("hex");
  let origin = "";
  await store.save(await store.project());
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    if (req.headers.host !== origin.replace("http://", ""))
      return res
        .status(403)
        .send("Invalid host. Open Protest at its local address.");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "no-referrer");
    if (req.path.startsWith("/api/")) {
      res.set("Cache-Control", "no-store");
      if (req.headers.origin && req.headers.origin !== origin)
        return res
          .status(403)
          .json({ error: "Cross origin requests are not allowed." });
      if (req.headers["sec-fetch-site"] === "cross-site")
        return res
          .status(403)
          .json({ error: "Cross site requests are not allowed." });
      if (req.method !== "GET" && req.headers["x-protest-session"] !== csrf)
        return res
          .status(403)
          .json({ error: "Reload Protest to restore this session." });
    }
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  const handle = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      next(e);
    }
  };
  app.get(
    "/api/session",
    handle(async (req, res) =>
      res.json({ csrf, project: await store.project(), guide }),
    ),
  );
  app.put(
    "/api/project",
    handle(async (req, res) => res.json(await store.save(req.body))),
  );
  app.post(
    "/api/new",
    handle(async (req, res) =>
      res.json(
        await store.save(req.body.example ? exampleProject() : newProject()),
      ),
    ),
  );
  app.get(
    "/api/readiness",
    handle(async (req, res) =>
      res.json({ issues: readiness(await store.project()) }),
    ),
  );
  app.get(
    "/api/github",
    handle(async (req, res) => res.json(await pub.account())),
  );
  app.post(
    "/api/github/login",
    handle(async (req, res) => res.json(pub.startLogin())),
  );
  app.get(
    "/api/github/login",
    handle(async (req, res) => res.json(pub.login)),
  );
  app.post(
    "/api/publish/prepare",
    handle(async (req, res) =>
      res.json(await pub.prepare(await store.project())),
    ),
  );
  app.post(
    "/api/publish",
    handle(async (req, res) => {
      if (req.body.confirmPublic !== true)
        throw new Error("Confirm the reviewed publication first.");
      res.json(await pub.publish(req.body.planId, await store.project()));
    }),
  );
  app.get(
    "/api/publish/status",
    handle(async (req, res) =>
      res.json(await pub.status(await store.project())),
    ),
  );
  app.get(
    "/api/download/project",
    handle(async (req, res) => {
      res.attachment("protest-project.json").json(await store.project());
    }),
  );
  app.get(
    "/api/preview/:type",
    handle(async (req, res) => {
      const p = await store.project();
      if (req.params.type === "flier")
        res.type("image/svg+xml").send(await posterSVG(p));
      else if (req.params.type === "site")
        res.type("html").send(await siteHTML(p));
      else res.sendStatus(404);
    }),
  );
  app.get(
    "/api/download/:type",
    handle(async (req, res) => {
      const p = await store.project();
      const deployment = await store.read("deployment.json", null);
      const url =
        deployment?.projectId === p.id &&
        deployment?.state === "live" &&
        deployment.revision === (await artifactRevision(p))
          ? deployment.url
          : "";
      const type = req.params.type;
      if (type === "pdf")
        res.attachment("protest-flier.pdf").send(await posterPDF(p, url));
      else if (type === "svg")
        res
          .attachment("protest-flier.svg")
          .send(await posterSVG(p, url, p.format));
      else if (type === "square" || type === "story")
        res
          .attachment(`protest-${type}.png`)
          .send(await posterPNG(p, url, type));
      else if (type === "site") {
        const issues = readiness(p);
        if (issues.length) throw new Error(issues.join(" "));
        const { files } = await buildFiles(p, url);
        res.attachment("protest-site.zip");
        const zip = archiver("zip", { zlib: { level: 9 } });
        zip.on("error", (e) => res.destroy(e));
        zip.pipe(res);
        for (const [name, data] of Object.entries(files))
          zip.append(data, { name });
        await zip.finalize();
      } else res.sendStatus(404);
    }),
  );
  app.use(express.static(join(ROOT, "dist"), { index: "index.html" }));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    res
      .status(400)
      .json({
        error:
          err.name === "ZodError"
            ? err.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join(" ")
            : err.message || "Something went wrong.",
      });
  });
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, "127.0.0.1", (error) =>
      error ? reject(error) : resolve(s),
    );
    s.on("error", reject);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin, store, publisher: pub };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (!existsSync(join(ROOT, "dist/index.html"))) {
    console.error("Build the editor first: pnpm build");
    process.exit(1);
  }
  let instance;
  try {
    instance = await startServer();
  } catch (e) {
    if (e.code !== "EADDRINUSE") throw e;
    console.log(
      "The usual local port is occupied. Choosing an available port.",
    );
    instance = await startServer({ port: 0 });
  }
  const { origin } = instance;
  console.log(
    `Protest is ready at ${origin}\nYour drafts stay in ${process.env.PROTEST_DATA_DIR || join(ROOT, ".protest")}\nClose this window to stop Protest.`,
  );
  if (process.argv.includes("--open")) {
    const [cmd, args] =
      process.platform === "win32"
        ? ["rundll32", ["url.dll,FileProtocolHandler", origin]]
        : process.platform === "darwin"
          ? ["open", [origin]]
          : ["xdg-open", [origin]];
    const child = spawn(cmd, args, {
      windowsHide: true,
      detached: true,
      stdio: "ignore",
    });
    child.on("error", () => {});
    child.unref();
  }
}
