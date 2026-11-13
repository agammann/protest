import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { exampleProject } from "../src/project.mjs";
import { startServer } from "../src/server.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
test("MCP stdio creates, updates and exports real local materials without publication", async () => {
  const root = await mkdtemp(join(tmpdir(), "protest-mcp-"));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("src/mcp.mjs")],
    env: { ...process.env, PROTEST_DATA_DIR: root },
    stderr: "pipe",
  });
  const client = new Client({ name: "protest-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 6);
    assert.ok(!tools.some((t) => t.name === "publish"));
    const call = async (name, args = {}) => {
      const r = await client.callTool({ name, arguments: args });
      assert.ok(!r.isError, JSON.stringify(r));
      return JSON.parse(r.content[0].text);
    };
    const created = await call("create_protest", {
      details: { title: "A community gathering" },
    });
    const updated = await call("update_protest", {
      projectId: created.project.id,
      changes: { organizer: "Community group" },
    });
    assert.equal(updated.project.organizer, "Community group");
    const conflict = await client.callTool({
      name: "create_protest",
      arguments: { details: {} },
    });
    assert.ok(conflict.isError);
    const exported = await call("export_materials");
    assert.equal(
      (await readFile(join(exported.directory, "flier.pdf")))
        .subarray(0, 4)
        .toString(),
      "%PDF",
    );
    assert.ok((await call("prepare_publication")).issues.length > 0);
  } finally {
    await client.close();
  }
});

// A draft accepted by Zod 3 may use a GUID shape without RFC UUID variant bits.
test("legacy draft IDs remain accessible to the server and MCP", async () => {
  const root = await mkdtemp(join(tmpdir(), "protest-legacy-"));
  const legacy = { ...exampleProject(), id: "00000000-0000-0000-0000-000000000001" };
  await writeFile(join(root, "project.json"), JSON.stringify(legacy));
  const app = await startServer({ port: 0, dataDir: root });
  const client = new Client({ name: "legacy-test", version: "1.0.0" });
  try {
    const session = await (await fetch(app.origin + "/api/session")).json();
    assert.equal(session.project.id, legacy.id);
    await client.connect(new StdioClientTransport({
      command: process.execPath, args: [resolve("src/mcp.mjs")],
      env: { ...process.env, PROTEST_DATA_DIR: root }, stderr: "pipe",
    }));
    const result = await client.callTool({ name: "update_protest", arguments: { projectId: legacy.id, changes: { organizer: "Legacy organizer" } } });
    assert.ok(!result.isError, JSON.stringify(result));
    const saved = JSON.parse(await readFile(join(root, "project.json"), "utf8"));
    assert.equal(saved.id, legacy.id);
    assert.equal(saved.organizer, "Legacy organizer");
  } finally {
    await client.close();
    app.server.closeAllConnections();
    await new Promise(resolve => app.server.close(resolve));
  }
});
