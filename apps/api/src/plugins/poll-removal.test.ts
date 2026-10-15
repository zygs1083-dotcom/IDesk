import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, expect, test } from "vitest";
import { z } from "zod";
import { db } from "../db/client.ts";
import { automationJobs, automationRuns, connectors, events, pluginState } from "../db/schema.ts";
import { pollConnector } from "./poll.ts";
import { registerPlugin, stopPlugins } from "./registry.ts";
import type { ConnectorPlugin, ExternalJob, ExternalRun } from "./types.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
const now = new Date("2026-10-14T12:00:00Z");
let jobs: ExternalJob[];
let runs: ExternalRun[];
let failure: boolean;
const plugin: ConnectorPlugin = {
  id: "poll-removal-fixture",
  name: "Removal fixture",
  version: "1",
  kind: "connector",
  configSchema: z.object({}),
  async testConnection() {
    return { success: true };
  },
  async listJobs() {
    if (failure) throw new Error("network failed");
    return jobs;
  },
  async listRuns() {
    return runs;
  },
};
let connector: typeof connectors.$inferSelect;
beforeEach(async () => {
  db.delete(connectors).run();
  db.delete(pluginState).run();
  db.delete(events).where(eq(events.type, "connector.polled")).run();
  jobs = ["A", "B"].map((externalId) => ({
    externalId,
    name: externalId,
    group: null,
    enabled: true,
    url: null,
  }));
  runs = jobs.map((job) => ({
    jobExternalId: job.externalId,
    externalId: "run",
    status: "success",
    startedAt: now,
    finishedAt: now,
    url: null,
    error: null,
    trigger: null,
  }));
  failure = false;
  await registerPlugin(plugin, new URL("file:///poll-removal-fixture.js"));
  connector = db
    .insert(connectors)
    .values({ pluginId: plugin.id, name: "Fixture", config: {} })
    .returning()
    .get();
});
afterEach(async () => {
  await stopPlugins();
  db.delete(connectors).run();
  db.delete(pluginState).run();
});

test("vanished jobs cascade their runs and count deletion without touching another connector", async () => {
  const other = db
    .insert(connectors)
    .values({ pluginId: plugin.id, name: "Other", config: {} })
    .returning()
    .get();
  await pollConnector(other, now);
  await pollConnector(connector, now);
  const vanished = db
    .select()
    .from(automationJobs)
    .where(eq(automationJobs.connectorId, connector.id))
    .all()
    .find((job) => job.externalId === "B");
  jobs = jobs.filter((job) => job.externalId === "A");
  await pollConnector(connector, now);
  expect(
    db
      .select()
      .from(automationJobs)
      .where(eq(automationJobs.connectorId, connector.id))
      .all()
      .map((job) => job.externalId),
  ).toEqual(["A"]);
  expect(db.select().from(automationRuns).all()).toHaveLength(3);
  expect(
    db
      .select()
      .from(automationRuns)
      .all()
      .some((run) => run.jobId === vanished?.id),
  ).toBe(false);
  expect(
    db.select().from(automationJobs).where(eq(automationJobs.connectorId, other.id)).all(),
  ).toHaveLength(2);
  expect(
    db.select().from(events).where(eq(events.type, "connector.polled")).all().at(-1)?.payload,
  ).toEqual({ connectorId: connector.id, changed: 1 });
});

test("an empty successful job listing removes every job and its runs", async () => {
  await pollConnector(connector, now);
  jobs = [];
  await pollConnector(connector, now);
  expect(db.select().from(automationJobs).all()).toHaveLength(0);
  expect(db.select().from(automationRuns).all()).toHaveLength(0);
  expect(
    db.select().from(events).where(eq(events.type, "connector.polled")).all().at(-1)?.payload,
  ).toEqual({ connectorId: connector.id, changed: 2 });
});

test("listJobs errors retain all mirrored jobs and runs", async () => {
  await pollConnector(connector, now);
  const storedJobs = db.select().from(automationJobs).all();
  const storedRuns = db.select().from(automationRuns).all();
  jobs = [];
  failure = true;
  await pollConnector(connector, now);
  expect(db.select().from(automationJobs).all()).toEqual(storedJobs);
  expect(db.select().from(automationRuns).all()).toEqual(storedRuns);
  expect(db.select().from(connectors).where(eq(connectors.id, connector.id)).get()?.lastError).toBe(
    "network failed",
  );
  expect(db.select().from(events).where(eq(events.type, "connector.polled")).all()).toHaveLength(1);
});
