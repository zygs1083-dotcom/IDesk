import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { db } from "../db/client.ts";
import { automationJobs, automationRuns, connectors, events, pluginState } from "../db/schema.ts";
import { pollConnector } from "./poll.ts";
import { registerPlugin, stopPlugins } from "./registry.ts";
import type { ConnectorPlugin, ExternalJob, ExternalRun } from "./types.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
const now = new Date("2026-10-18T12:00:00Z");
const job: ExternalJob = {
  externalId: "job",
  name: "Job",
  group: null,
  schedule: null,
  enabled: true,
  url: null,
};
const run: ExternalRun = {
  externalId: "run",
  jobExternalId: "job",
  status: "running",
  startedAt: new Date(now.getTime() - 1000),
  finishedAt: null,
  trigger: null,
  url: null,
  error: null,
};
const listJobs = vi.fn<ConnectorPlugin["listJobs"]>();
const listRuns = vi.fn<ConnectorPlugin["listRuns"]>();
let connector: typeof connectors.$inferSelect;
beforeEach(async () => {
  listJobs.mockReset().mockResolvedValue([job]);
  listRuns.mockReset().mockResolvedValue([run]);
  const plugin: ConnectorPlugin = {
    id: "reliability",
    name: "Fixture",
    version: "1",
    kind: "connector",
    configSchema: z.object({}),
    testConnection: async () => ({ success: true }),
    listJobs,
    listRuns,
  };
  await registerPlugin(plugin, new URL("file:///reliability.js"));
  connector = db
    .insert(connectors)
    .values({ pluginId: "reliability", name: "Fixture", config: {} })
    .returning()
    .get();
});
afterEach(async () => {
  await stopPlugins();
  db.delete(connectors).run();
  db.delete(pluginState).run();
});
const current = () => db.select().from(connectors).where(eq(connectors.id, connector.id)).get();

test("success, consecutive failures and recovery keep the successful window and jobs intact", async () => {
  listRuns.mockResolvedValue([{ ...run, status: "success" }]);
  await pollConnector(connector, now);
  listJobs.mockResolvedValue([]);
  listRuns.mockRejectedValue(new Error("page 2 failed"));
  for (const offset of [60_000, 120_000])
    await pollConnector(connector, new Date(now.getTime() + offset));
  expect(current()).toMatchObject({
    lastSucceededAt: now,
    lastPolledAt: new Date(now.getTime() + 120_000),
    lastError: "page 2 failed",
  });
  expect(db.select().from(automationJobs).all()).toHaveLength(1);
  listJobs.mockResolvedValue([job]);
  listRuns.mockImplementation(async (_config, { since }) => {
    expect(since).toEqual(now);
    return [
      {
        ...run,
        externalId: "short-between-failures",
        status: "success",
        startedAt: new Date(now.getTime() + 30_000),
      },
    ];
  });
  await pollConnector(connector, new Date(now.getTime() + 180_000));
  expect(db.select().from(automationRuns).all()).toHaveLength(2);
  expect(current()?.lastError).toBeNull();
});

test("retains old running and waiting executions alongside fifty terminal executions", async () => {
  listRuns.mockResolvedValue([
    run,
    { ...run, externalId: "waiting", startedAt: null, status: "waiting" },
    ...Array.from({ length: 60 }, (_, i) => ({
      ...run,
      externalId: String(i),
      status: "success" as const,
      startedAt: new Date(now.getTime() + i * 1000),
    })),
  ]);
  await pollConnector(connector, now);
  expect(db.select().from(automationRuns).all()).toHaveLength(52);
  listRuns.mockResolvedValue([{ ...run, status: "success", finishedAt: now }]);
  await pollConnector(connector, new Date(now.getTime() + 60_000));
  expect(listRuns.mock.calls[1]?.[1].since).toEqual(run.startedAt);
  expect(db.select().from(automationRuns).all()).toHaveLength(51);
  expect(
    db.select().from(automationRuns).where(eq(automationRuns.externalId, "run")).get(),
  ).toBeUndefined();
});

test("stores runs across more than fifty different jobs", async () => {
  listJobs.mockResolvedValue(
    Array.from({ length: 65 }, (_, i) => ({ ...job, externalId: String(i) })),
  );
  listRuns.mockResolvedValue(
    Array.from({ length: 65 }, (_, i) => ({ ...run, jobExternalId: String(i) })),
  );
  await pollConnector(connector, now);
  expect(db.select().from(automationRuns).all()).toHaveLength(65);
});

test.each(["delete", "disable", "config"])(
  "coalesces concurrent polls and discards results after %s",
  async (change) => {
    let finish!: (runs: ExternalRun[]) => void;
    listRuns.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const first = pollConnector(connector, now);
    const second = pollConnector(connector, new Date(now.getTime() + 1000));
    expect(second).toBe(first);
    await Promise.resolve();
    expect(listJobs).toHaveBeenCalledTimes(1);
    expect(listRuns).toHaveBeenCalledTimes(1);
    if (change === "delete") db.delete(connectors).where(eq(connectors.id, connector.id)).run();
    else
      db.update(connectors)
        .set(change === "disable" ? { enabled: false } : { config: { changed: true } })
        .where(eq(connectors.id, connector.id))
        .run();
    finish([run]);
    await first;
    expect(db.select().from(automationJobs).all()).toHaveLength(0);
    expect(current()?.lastSucceededAt ?? null).toBeNull();
  },
);

test("field-only changes invalidate jobs and runs even without a status change", async () => {
  await pollConnector(connector, now);
  listJobs.mockResolvedValue([{ ...job, name: "Renamed", group: "Group", enabled: false }]);
  listRuns.mockResolvedValue([{ ...run, url: "https://example.test/run", trigger: "manual" }]);
  await pollConnector(connector, now);
  expect(
    db.select().from(events).where(eq(events.type, "connector.polled")).all().at(-1)?.payload
      .changed,
  ).toBe(2);
});

test("a disabled connector does not start even with a stale enabled snapshot", async () => {
  db.update(connectors).set({ enabled: false }).where(eq(connectors.id, connector.id)).run();
  await pollConnector(connector, now);
  expect(listJobs).not.toHaveBeenCalled();
});

test("an active run older than seven days extends the initial bounded window", async () => {
  const storedJob = db
    .insert(automationJobs)
    .values({ ...job, connectorId: connector.id })
    .returning()
    .get();
  const old = new Date(now.getTime() - 14 * 86_400_000);
  const { jobExternalId: _, ...fields } = run;
  db.insert(automationRuns)
    .values({ ...fields, jobId: storedJob.id, startedAt: old })
    .run();
  await pollConnector(connector, now);
  expect(listRuns.mock.calls[0]?.[1].since).toEqual(old);
});

test("a delayed scheduler timestamp cannot overwrite a newer completed poll", async () => {
  await pollConnector(connector, now);
  await pollConnector(connector, new Date(now.getTime() - 60_000));
  expect(listJobs).toHaveBeenCalledTimes(1);
  expect(current()?.lastSucceededAt).toEqual(now);
});
