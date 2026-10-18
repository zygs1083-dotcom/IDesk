import { automationJobSchema } from "@idesk/shared/automation-schemas";
import { afterEach, expect, test } from "vitest";
import { z } from "zod";
import { db } from "../db/client.ts";
import { connectors, pluginState } from "../db/schema.ts";
import { pollConnector } from "../plugins/poll.ts";
import { registerPlugin, stopPlugins } from "../plugins/registry.ts";
import type { ConnectorPlugin, ExternalJob } from "../plugins/types.ts";
import { app } from "./app.ts";

afterEach(async () => {
  await stopPlugins();
  db.delete(connectors).run();
  db.delete(pluginState).run();
});

test("polling exposes schedules, updates them and clears them when the plugin returns null", async () => {
  let schedule: ExternalJob["schedule"] = { cron: "0 9 * * *", timezone: "Asia/Shanghai" };
  const plugin: ConnectorPlugin = {
    id: "schedule-fixture",
    name: "Schedule fixture",
    version: "1",
    kind: "connector",
    configSchema: z.object({}),
    async testConnection() {
      return { success: true };
    },
    async listJobs() {
      return [
        { externalId: "daily", name: "Daily", group: null, enabled: true, url: null, schedule },
      ];
    },
    async listRuns() {
      return [];
    },
  };
  await registerPlugin(plugin, new URL("file:///schedule-fixture.js"));
  const connector = db
    .insert(connectors)
    .values({ pluginId: plugin.id, name: "Schedules", config: {} })
    .returning()
    .get();
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  const cookie = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
  async function readSchedule() {
    const response = await app.request(`/api/v1/automation/jobs?connectorId=${connector.id}`, {
      headers: { Cookie: cookie },
    });
    expect(response.status).toBe(200);
    return z.array(automationJobSchema).parse(await response.json())[0]?.schedule;
  }
  await pollConnector(connector, new Date());
  expect(await readSchedule()).toEqual(schedule);
  schedule = { cron: "0 10 * * *", timezone: "UTC" };
  await pollConnector(connector, new Date());
  expect(await readSchedule()).toEqual(schedule);
  schedule = null;
  await pollConnector(connector, new Date());
  expect(await readSchedule()).toBeNull();
});
