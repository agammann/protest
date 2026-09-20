import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { projectSchema, exampleProject } from "./project.mjs";
export class Store {
  constructor(root) {
    this.root = resolve(root);
    this.queue = Promise.resolve();
  }
  async read(name, fallback) {
    try {
      return JSON.parse(await readFile(join(this.root, name), "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") return fallback;
      throw new Error(
        `Cannot read ${name}. Keep a copy of the file and repair its JSON before continuing.`,
      );
    }
  }
  async write(name, data) {
    const run = this.queue.then(async () => {
      await mkdir(this.root, { recursive: true });
      const dest = join(this.root, name),
        tmp = `${dest}.${randomUUID()}.tmp`;
      await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
      await rename(tmp, dest);
    });
    this.queue = run.catch(() => {});
    return run;
  }
  async project() {
    return projectSchema.parse(
      await this.read("project.json", exampleProject()),
    );
  }
  async save(p) {
    p = projectSchema.parse(p);
    await this.write("project.json", p);
    return p;
  }
}
