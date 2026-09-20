import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import archiver from "archiver";
import { ROOT } from "../src/paths.mjs";
if (process.platform !== "win32")
  throw new Error("This portable packager currently supports Windows only.");
const pnpm = process.env.PROTEST_PNPM || process.env.npm_execpath;
const gh = process.env.PROTEST_GH_PATH;
if (!pnpm || !gh)
  throw new Error(
    "Run with pnpm package and set PROTEST_GH_PATH to an official GitHub CLI executable.",
  );
const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const release = join(ROOT, "release"),
  stage = join(release, `stage-${Date.now()}`),
  app = join(stage, "Protest");
await mkdir(stage, { recursive: true });
await mkdir(app, { recursive: true });
for (const name of [
  "dist",
  "src",
  "public",
  "docs",
  "tools",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "THIRD_PARTY_NOTICES.md",
  "package.json",
  "pnpm-lock.yaml",
])
  await cp(join(ROOT, name), join(app, name), { recursive: true });
const r = spawnSync(
  process.execPath,
  [
    pnpm,
    "install",
    "--prod",
    "--frozen-lockfile",
    "--ignore-workspace",
    "--ignore-scripts",
    "--config.node-linker=hoisted",
  ],
  { cwd: app, stdio: "inherit", env: { ...process.env, CI: "true" } },
);
if (r.status !== 0)
  throw new Error("Production dependency installation failed.");
await cp(process.execPath, join(app, "node.exe"));
await mkdir(join(app, "tools"), { recursive: true });
await cp(resolve(gh), join(app, "tools", "gh.exe"));
await cp(
  join(ROOT, "THIRD_PARTY_NOTICES.md"),
  join(app, "THIRD_PARTY_NOTICES.md"),
);
await writeFile(
  join(app, "Start Protest.cmd"),
  '@echo off\r\ncd /d "%~dp0"\r\n"%~dp0node.exe" "%~dp0src\\server.mjs" --open\r\nif errorlevel 1 pause\r\n',
);
const zipPath = join(release, `Protest-${pkg.version}-windows-x64.zip`);
const output = createWriteStream(zipPath),
  zip = archiver("zip", { zlib: { level: 9 } });
const done = new Promise((resolve, reject) => {
  output.on("close", resolve);
  output.on("error", reject);
  zip.on("error", reject);
});
zip.pipe(output);
// Follow package-manager links so extraction needs no symlink privileges.
async function appendDirectory(directory, prefix) {
  const { readdir, stat } = await import("node:fs/promises");
  for (const entry of await readdir(directory)) {
    if (
      entry === ".pnpm" ||
      entry === ".bin" ||
      entry === ".modules.yaml" ||
      entry === ".pnpm-workspace-state-v1.json"
    )
      continue;
    const path = join(directory, entry),
      name = prefix + "/" + entry;
    const info = await stat(path);
    if (info.isDirectory()) await appendDirectory(path, name);
    else zip.file(path, { name });
  }
}
await appendDirectory(app, "Protest");
await zip.finalize();
await done;
const hash = createHash("sha256")
  .update(await readFile(zipPath))
  .digest("hex");
await writeFile(
  zipPath + ".sha256",
  `${hash}  ${zipPath.split(/[\\/]/).pop()}\n`,
);
console.log(`Created ${zipPath}\nSHA256 ${hash}`);
