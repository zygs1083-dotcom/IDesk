import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, expect, test } from "vitest";
import { z } from "zod";
import { db } from "../db/client.ts";
import { automationJobs, automationRuns, connectors, events, pluginState } from "../db/schema.ts";
import { pollConnector, pollDueConnectors } from "./poll.ts";
import { disablePlugin, registerPlugin, stopPlugins } from "./registry.ts";
import type { ConnectorPlugin, ExternalRun } from "./types.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
const now = new Date("2026-10-14T12:00:00Z");
let runs: ExternalRun[];
let failure: boolean;
const calls: { since: Date | null; limit: number }[] = [];
const plugin: ConnectorPlugin = {
  id: "poll-fixture",
  name: "Poll fixture",
  version: "1",
  kind: "connector",
  configSchema: z.object({ token: z.string() }),
  async testConnection() {
    return { success: true };
  },
  async listJobs(config) {
    expect(config).toEqual({ token: "test" });
    if (failure) throw new Error("network failed");
    return [{ externalId: "workflow", name: "Workflow", enabled: true, url: null }];
  },
  async listRuns(_config, options) {
    calls.push(options);
    return runs;
  },
};
let connector: typeof connectors.$inferSelect;
beforeEach(async () => {
  db.delete(connectors).run();
  db.delete(pluginState).run();
  db.delete(events).where(eq(events.type, "connector.polled")).run();
  calls.length = 0;
  failure = false;
  runs = [
    {
      jobExternalId: "workflow",
      externalId: "run",
      status: "running",
      startedAt: new Date(now.getTime() - 10000),
      finishedAt: null,
      url: null,
      error: null,
      trigger: "manual",
    },
  ];
  await registerPlugin(plugin, new URL("file:///poll-fixture.js"));
  connector = db
    .insert(connectors)
    .values({ pluginId: plugin.id, name: "Fixture", config: { token: "test" } })
    .returning()
    .get();
});
afterEach(async () => {
  await stopPlugins();
  db.delete(connectors).run();
  db.delete(pluginState).run();
});
function polled() {
  return db.select().from(events).where(eq(events.type, "connector.polled")).all();
}
function refreshed() {
  return db
    .select()
    .from(connectors)
    .where(eq(connectors.id, connector.id))
    .get() as typeof connectors.$inferSelect;
}

test("polling upserts jobs and runs, derives latest status and emits only changes", async () => {
  runs.push({
    ...(runs[0] as ExternalRun),
    externalId: "older",
    status: "success",
    startedAt: new Date(now.getTime() - 20000),
  });
  runs.push({ ...(runs[0] as ExternalRun), externalId: "orphan", jobExternalId: "missing" });
  await pollConnector(connector, now);
  expect(db.select().from(automationRuns).all()).toHaveLength(2);
  expect(db.select().from(automationRuns).all()[0]?.trigger).toBe("manual");
  expect(db.select().from(automationJobs).get()).toMatchObject({
    lastRunStatus: "running",
    lastRunAt: runs[0]?.startedAt,
  });
  expect(polled()[0]?.payload).toEqual({ connectorId: connector.id, changed: 3 });
  expect(calls[0]).toMatchObject({ since: null, limit: 50 });
  await pollConnector(refreshed(), new Date(now.getTime() + 60000));
  expect(polled()).toHaveLength(1);
  expect(calls[1]?.since).toEqual(runs[0]?.startedAt);
  runs[0] = { ...(runs[0] as ExternalRun), status: "success", finishedAt: now, trigger: "webhook" };
  await pollConnector(refreshed(), new Date(now.getTime() + 120000));
  expect(polled()[1]?.payload.changed).toBe(1);
  expect(
    db.select().from(automationRuns).where(eq(automationRuns.externalId, "run")).get(),
  ).toMatchObject({ status: "success", finishedAt: now, trigger: "webhook" });
  expect(db.select().from(automationJobs).get()?.lastRunStatus).toBe("success");
  const last = refreshed().lastPolledAt;
  await pollConnector(refreshed(), new Date(now.getTime() + 180000));
  expect(calls[3]?.since).toEqual(last);
  expect(refreshed()).toMatchObject({
    lastError: null,
    lastPolledAt: new Date(now.getTime() + 180000),
  });
});

test("polling retains each job's latest fifty runs", async () => {
  runs = Array.from({ length: 60 }, (_, index) => ({
    ...(runs[0] as ExternalRun),
    externalId: String(index),
    status: "success",
    startedAt: new Date(now.getTime() + index * 1000),
  }));
  await pollConnector(connector, now);
  const stored = db.select().from(automationRuns).all();
  expect(stored).toHaveLength(50);
  expect(stored.map((run) => Number(run.externalId)).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 50 }, (_, i) => i + 10),
  );
  expect(db.select().from(automationJobs).get()?.lastRunAt).toEqual(runs[59]?.startedAt);
  expect(polled()[0]?.payload.changed).toBe(61);
});

test("plugin errors persist lastError and a later success clears it", async () => {
  failure = true;
  await pollConnector(connector, now);
  expect(refreshed()).toMatchObject({ lastError: "network failed", lastPolledAt: now });
  expect(polled()).toHaveLength(0);
  failure = false;
  await pollConnector(refreshed(), now);
  expect(refreshed().lastError).toBeNull();
});

test("due scanning skips early, disabled and unavailable plugins and continues after failures", async () => {
  db.update(connectors).set({ lastPolledAt: now }).where(eq(connectors.id, connector.id)).run();
  await pollDueConnectors(new Date(now.getTime() + 59000));
  expect(calls).toHaveLength(0);
  await pollDueConnectors(new Date(now.getTime() + 60000));
  expect(calls).toHaveLength(1);
  db.update(connectors).set({ enabled: false }).where(eq(connectors.id, connector.id)).run();
  await pollDueConnectors(new Date(now.getTime() + 120000));
  expect(calls).toHaveLength(1);
  db.update(connectors).set({ enabled: true }).where(eq(connectors.id, connector.id)).run();
  await disablePlugin(plugin.id);
  await pollDueConnectors(new Date(now.getTime() + 120000));
  expect(calls).toHaveLength(1);
  expect(refreshed().lastError).toBeNull();
  const failingPlugin: ConnectorPlugin = {
    ...plugin,
    id: "failure",
    async listJobs() {
      throw new Error("failed first");
    },
  };
  await registerPlugin(failingPlugin, new URL("file:///failure.js"));
  await registerPlugin({ ...plugin, id: "success" }, new URL("file:///success.js"));
  db.insert(connectors)
    .values([
      { pluginId: "failure", name: "First", config: { token: "test" } },
      { pluginId: "success", name: "Second", config: { token: "test" } },
      { pluginId: "missing", name: "Missing", config: {} },
    ])
    .run();
  await pollDueConnectors(now);
  expect(calls).toHaveLength(2);
  expect(
    db.select().from(connectors).where(eq(connectors.pluginId, "failure")).get()?.lastError,
  ).toBe("failed first");
  expect(
    db.select().from(connectors).where(eq(connectors.pluginId, "missing")).get()?.lastPolledAt,
  ).toBeNull();
});

test("waiting runs without a start time keep the polling window open", async () => {
  runs[0] = { ...(runs[0] as ExternalRun), status: "waiting", startedAt: null };
  await pollConnector(connector, now);
  await pollConnector(refreshed(), new Date(now.getTime() + 60000));
  expect(calls[1]?.since).toBeNull();
});
