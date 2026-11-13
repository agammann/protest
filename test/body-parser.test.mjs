import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { gzipSync } from "node:zlib";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { startServer } from "../src/server.mjs";

function send(origin, body, encoding) {
  const port = Number(new URL(origin).port);
  return new Promise((resolveResponse, reject) => {
    const headers = [
      "POST /unmatched HTTP/1.1",
      `Host: 127.0.0.1:${port}`,
      "Content-Type: application/json",
      ...(encoding ? [`Content-Encoding: ${encoding}`] : []),
      "Connection: close",
      `Content-Length: ${body.length}`,
      "",
      "",
    ].join("\r\n");
    let response = "";
    const socket = net.connect(port, "127.0.0.1", () => {
      socket.write(headers);
      socket.write(body);
    });
    socket.on("data", (data) => (response += data.toString()));
    socket.on("end", () => resolveResponse(response.split("\r\n")[0]));
    socket.on("error", reject);
  });
}

test("compressed JSON with trailing bytes leaves the local server running", { timeout: 10000 }, async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "protest-body-test-"));
  const app = await startServer({ port: 0, dataDir, publisher: {} });
  try {
    assert.match(await send(app.origin, Buffer.from("{}")), /^HTTP\/1\.1 404 /);
    const malformed = Buffer.concat([
      gzipSync(Buffer.from("{}")),
      Buffer.from([0x00]),
      Buffer.alloc(100 * 1024, 0x58),
    ]);
    assert.match(await send(app.origin, malformed, "gzip"), /^HTTP\/1\.1 404 /);
    await new Promise((done) => setTimeout(done, 100));
    assert.equal((await fetch(app.origin + "/api/session")).status, 200);
  } finally {
    app.server.closeAllConnections();
    await new Promise((done) => app.server.close(done));
    if (
      !resolve(dataDir).startsWith(resolve(tmpdir()) + sep) ||
      !basename(dataDir).startsWith("protest-body-test-")
    ) throw new Error("Unexpected disposable directory");
    await rm(dataDir, { recursive: true, force: true });
  }
});
