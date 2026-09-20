import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "./paths.mjs";
import { Store } from "./store.mjs";
import {
  newProject,
  projectSchema,
  readiness,
  publicProject,
  guide,
} from "./project.mjs";
import { posterPDF, posterPNG, posterSVG, buildFiles } from "./render.mjs";
const store = new Store(process.env.PROTEST_DATA_DIR || join(ROOT, ".protest"));
const server = new McpServer({ name: "protest", version: "0.1.0" });
const result = (v) => ({
  content: [{ type: "text", text: JSON.stringify(v, null, 2) }],
});
const safe = (fn) => async (args) => {
  try {
    return result(await fn(args));
  } catch (e) {
    return { ...result({ error: e.message }), isError: true };
  }
};
server.registerTool(
  "get_protest",
  {
    description:
      "Read the current public draft and readiness issues. Private planning notes are excluded.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  safe(async () => {
    const p = await store.project();
    return { project: publicProject(p), issues: readiness(p) };
  }),
);
server.registerTool(
  "create_protest",
  {
    description:
      "Create a new local draft. Does not publish. Replacing an existing draft requires replaceCurrent=true; save a project backup first.",
    inputSchema: {
      details: projectSchema
        .omit({
          version: true,
          id: true,
          example: true,
          checks: true,
          privateNotes: true,
        })
        .partial(),
      replaceCurrent: z.boolean().default(false),
    },
    annotations: { destructiveHint: true },
  },
  safe(async ({ details, replaceCurrent }) => {
    const current = await store.read("project.json", null);
    if (current && !replaceCurrent)
      throw new Error(
        "A draft already exists. Export it first and explicitly request replacement.",
      );
    const p = await store.save({ ...newProject(), ...details });
    return { project: publicProject(p), issues: readiness(p) };
  }),
);
server.registerTool(
  "update_protest",
  {
    description:
      "Update supplied fields in the local draft. Uses an expected project ID to avoid editing a different draft. Does not publish or include private notes.",
    inputSchema: {
      projectId: z.string().uuid(),
      changes: projectSchema
        .omit({
          version: true,
          id: true,
          example: true,
          privateNotes: true,
          checks: true,
        })
        .partial(),
    },
    annotations: { destructiveHint: false },
  },
  safe(async ({ projectId, changes }) => {
    const p = await store.project();
    if (p.id !== projectId)
      throw new Error("The current project changed. Read it before editing.");
    const next = await store.save({ ...p, ...changes });
    return { project: publicProject(next), issues: readiness(next) };
  }),
);
server.registerTool(
  "check_protest",
  {
    description:
      "Check required details and read the preparation guide. This is a completeness check, not factual or legal verification.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  safe(async () => ({ issues: readiness(await store.project()), guide })),
);
server.registerTool(
  "export_materials",
  {
    description:
      "Generate local flier PDF, editable SVG, square and story PNG, and a project backup. No network or publication. Files are written only inside Protest exports.",
    inputSchema: {},
    annotations: { destructiveHint: false },
  },
  safe(async () => {
    const p = await store.project(),
      dir = join(store.root, "exports", p.id);
    await mkdir(dir, { recursive: true });
    const files = {
      "flier.pdf": await posterPDF(p),
      "flier.svg": await posterSVG(p),
      "social.png": await posterPNG(p),
      "story.png": await posterPNG(p, "", "story"),
      "project.json": JSON.stringify(p, null, 2),
    };
    for (const [name, data] of Object.entries(files))
      await writeFile(join(dir, name), data);
    return {
      directory: dir,
      files: Object.keys(files),
      notice:
        "Draft exports have no QR code. Project backup contains private notes. Keep it private.",
    };
  }),
);
server.registerTool(
  "prepare_publication",
  {
    description:
      "Check the local draft and describe exactly what will be public. To publish, the organizer reviews and confirms in the local Protest editor. This tool never uploads.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  safe(async () => {
    const p = await store.project();
    return {
      publicDetails: publicProject(p),
      issues: readiness(p),
      next: "Open Protest, choose Publish, connect your GitHub account, and review the publication. Public writes require approval in the editor.",
      editor: `http://127.0.0.1:${process.env.PROTEST_PORT || 4317}/`,
    };
  }),
);
await server.connect(new StdioServerTransport());
