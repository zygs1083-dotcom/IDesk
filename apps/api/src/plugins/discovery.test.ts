import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

// Vitest normalizes import query strings; exercise cache invalidation in the production runtime.
test("external JS plugins reload from disk and preserve disabled state across restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "idesk-plugins-"));
  await mkdir(join(directory, "external"));
  await writeFile(join(directory, "package.json"), JSON.stringify({ type: "module" }));
  const source = (
    version: string,
  ) => `import { z } from ${JSON.stringify(import.meta.resolve("zod"))};
  export default {
    id: "external", name: "External", version: "${version}", kind: "action",
    configSchema: z.object({}),
    setup(ctx) { ctx.events.emit({ type: "external.setup" }); }
  };`;
  const entry = join(directory, "external/index.js");
  await writeFile(entry, source("1"));
  const script = `
    import assert from "node:assert/strict";
    import { writeFile } from "node:fs/promises";
    import { migrate } from ${JSON.stringify(import.meta.resolve("drizzle-orm/better-sqlite3/migrator"))};
    import { db } from ${JSON.stringify(new URL("../db/client.ts", import.meta.url).href)};
    import { startPlugins, stopPlugins } from ${JSON.stringify(new URL("./host.ts", import.meta.url).href)};
    import { disablePlugin, enablePlugin, listPlugins, reloadPlugin } from ${JSON.stringify(new URL("./registry.ts", import.meta.url).href)};
    migrate(db, { migrationsFolder: ${JSON.stringify(new URL("../../drizzle", import.meta.url).pathname)} });
    const external = () => listPlugins().find(plugin => plugin.id === "external");
    await startPlugins();
    assert.equal(external().version, "1");
    assert.equal(external().enabled, true);
    await writeFile(${JSON.stringify(entry)}, ${JSON.stringify(source("2"))});
    await reloadPlugin("external");
    assert.equal(external().version, "2");
    assert.equal(external().enabled, true);
    await disablePlugin("external");
    await enablePlugin("external");
    assert.equal(external().version, "2");
    assert.equal(external().enabled, true);
    await disablePlugin("external");
    await stopPlugins();
    await startPlugins();
    assert.equal(external().enabled, false);
    await stopPlugins();
  `;
  const result = await promisify(execFile)(
    process.execPath,
    ["--import", import.meta.resolve("tsx"), "--input-type=module", "--eval", script],
    {
      env: { ...process.env, IDESK_PLUGIN_DIR: directory, IDESK_DATA_DIR: join(directory, "data") },
    },
  );
  expect(result.stderr).toBe("");
  await rm(directory, { recursive: true });
});
