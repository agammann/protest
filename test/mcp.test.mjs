import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
