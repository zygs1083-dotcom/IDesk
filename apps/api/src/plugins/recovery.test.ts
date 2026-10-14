import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { expect, test } from "vitest";
import { z } from "zod";
import { db } from "../db/client.ts";
import { pluginState } from "../db/schema.ts";
import { app } from "../http/app.ts";
import { cookie } from "./host-fixture.ts";
import { enablePlugin, plugins, registerPlugin, reloadPlugin } from "./registry.ts";

test("failed setup removes routes and reload retries the intended enabled plugin", async () => {
  const directory = mkdtempSync(join(tmpdir(), "idesk-reload-"));
  const source = pathToFileURL(join(directory, "plugin.mjs"));
  writeFileSync(
    source,
    `import { z } from ${JSON.stringify(import.meta.resolve("zod"))}; export default { id: "recovery", name: "Recovery", kind: "action", version: "2", configSchema: z.object({}), setup() {} };`,
  );
  await registerPlugin(
    {
      id: "recovery",
      name: "Recovery",
      kind: "action",
      version: "1",
      configSchema: z.object({}),
      setup(ctx) {
        ctx.registerRoutes(new Hono().get("/ping", (c) => c.text("pong")));
        throw new Error("broken setup");
      },
    },
    source,
  );
  expect(plugins.get("recovery")).toMatchObject({ enabled: false, error: "broken setup" });
  expect(
    (await app.request("/api/plugins/recovery/ping", { headers: { Cookie: cookie } })).status,
  ).toBe(404);
  await reloadPlugin("recovery");
  expect(plugins.get("recovery")).toMatchObject({ enabled: true });
  expect(plugins.get("recovery")?.error).toBeUndefined();
  rmSync(directory, { recursive: true });
});

test("enable failures preserve persisted intent and can retry after setup changes", async () => {
  let broken = true;
  await registerPlugin(
    {
      id: "enable-recovery",
      name: "Enable",
      version: "1",
      kind: "action",
      enabledByDefault: false,
      configSchema: z.object({}),
      setup() {
        if (broken) throw new Error("broken");
      },
    },
    new URL("file:///enable-recovery.js"),
  );
  await enablePlugin("enable-recovery");
  expect(
    db.select().from(pluginState).where(eq(pluginState.pluginId, "enable-recovery")).get()?.enabled,
  ).toBe(true);
  expect(plugins.get("enable-recovery")).toMatchObject({ enabled: false, error: "broken" });
  broken = false;
  await enablePlugin("enable-recovery");
  expect(plugins.get("enable-recovery")?.enabled).toBe(true);
  expect(plugins.get("enable-recovery")?.error).toBeUndefined();
});
