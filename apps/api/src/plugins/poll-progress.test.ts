import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, expect, test } from "vitest";
import { z } from "zod";
import { listConnectors } from "../core/connectors/connectors.ts";
import { db } from "../db/client.ts";
import { connectors, pluginState } from "../db/schema.ts";
import { pollConnector, polling } from "./poll.ts";
import { registerPlugin, stopPlugins } from "./registry.ts";
import type { ConnectorPlugin } from "./types.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
const seen: ({ done: number; total: number } | null)[] = [];
const plugin: ConnectorPlugin = {
  id: "poll-progress-fixture",
  name: "Progress fixture",
  version: "1",
  kind: "connector",
  configSchema: z.object({}),
  async testConnection() {
    return { success: true };
  },
  async listJobs(_config, opts) {
    opts?.progress?.(1, 3);
    seen.push(listConnectors()[0]?.progress ?? null);
    return [];
  },
  async listRuns() {
    return [];
  },
};
afterEach(async () => {
  await stopPlugins();
  db.delete(connectors).run();
  db.delete(pluginState).run();
});

test("progress reported by the plugin shows on the connector while polling and clears after", async () => {
  await registerPlugin(plugin, new URL("file:///poll-progress-fixture.js"));
  const connector = db
    .insert(connectors)
    .values({ pluginId: plugin.id, name: "Fixture", config: {} })
    .returning()
    .get();
  await pollConnector(connector, new Date());
  expect(seen).toEqual([{ done: 1, total: 3 }]);
  expect(polling.has(connector.id)).toBe(false);
  expect(listConnectors()[0]?.progress).toBeNull();
});
