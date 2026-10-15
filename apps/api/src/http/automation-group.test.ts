import { automationJobSchema, automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, expect, test } from "vitest";
import { z } from "zod";
import { db } from "../db/client.ts";
import { automationJobs, connectors, pluginState } from "../db/schema.ts";
import { pollConnector } from "../plugins/poll.ts";
import { registerPlugin, stopPlugins } from "../plugins/registry.ts";
import type { ConnectorPlugin } from "../plugins/types.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
afterEach(async () => {
  await stopPlugins();
  db.delete(connectors).run();
  db.delete(pluginState).run();
});

test("polling fills existing job groups, exposes nullable groups and updates them on later polls", async () => {
  let group = "Alpha";
  const plugin: ConnectorPlugin = {
    id: "group-fixture",
    name: "Group fixture",
    version: "1",
    kind: "connector",
    configSchema: z.object({}),
    async testConnection() {
      return { success: true };
    },
    async listJobs() {
      return ["grouped", "ungrouped"].map((name) => ({
        externalId: name,
        name,
        group: name === "grouped" ? group : null,
        enabled: true,
        url: null,
      }));
    },
    async listRuns() {
      return ["grouped", "ungrouped"].map((jobExternalId) => ({
        externalId: jobExternalId,
        jobExternalId,
        status: "success" as const,
        trigger: "manual",
        startedAt: new Date("2026-10-14T12:00:00Z"),
        finishedAt: null,
        url: null,
        error: null,
      }));
    },
  };
  await registerPlugin(plugin, new URL("file:///group-fixture.js"));
  const connector = db
    .insert(connectors)
    .values({
      pluginId: plugin.id,
      name: "Groups",
      config: {},
    })
    .returning()
    .get();
  const existing = db
    .insert(automationJobs)
    .values({
      connectorId: connector.id,
      externalId: "grouped",
      name: "grouped",
    })
    .returning()
    .get();
  expect(existing.group).toBeNull();
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  const cookie = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
  async function readGroups() {
    const jobs = z.array(automationJobSchema).parse(
      await (
        await app.request(`/api/v1/automation/jobs?connectorId=${connector.id}`, {
          headers: { Cookie: cookie },
        })
      ).json(),
    );
    const runs = z.array(automationRunWithJobSchema).parse(
      await (
        await app.request(`/api/v1/automation/runs?connectorId=${connector.id}`, {
          headers: { Cookie: cookie },
        })
      ).json(),
    );
    expect(jobs.map((job) => job.group)).toEqual([group, null]);
    expect(runs.map((run) => [run.jobName, run.jobGroup]).sort()).toEqual([
      ["grouped", group],
      ["ungrouped", null],
    ]);
    expect(
      db.select().from(automationJobs).where(eq(automationJobs.id, existing.id)).get()?.group,
    ).toBe(group);
  }
  await pollConnector(connector, new Date());
  await readGroups();
  group = "Renamed";
  await pollConnector(connector, new Date());
  await readGroups();
});
