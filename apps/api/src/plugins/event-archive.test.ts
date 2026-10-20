import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterAll, afterEach, beforeEach, expect, test, vi } from "vitest";
import { eventSchema } from "../../../../packages/shared/src/task-schemas.ts";
import eventArchive, { archive } from "../../../../plugins/event-archive/index.ts";
import type { PluginContext } from "./types.ts";

const dataDir = mkdtempSync(join(tmpdir(), "idesk-event-archive-"));
vi.stubEnv("IDESK_DATA_DIR", dataDir);
const { db } = await import("../db/client.ts");
const { events, pluginState } = await import("../db/schema.ts");
const { app } = await import("../http/app.ts");
const { startPlugins } = await import("./host.ts");
const { plugins, enablePlugin, stopPlugins } = await import("./registry.ts");
migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
const now = new Date("2026-10-15T00:00:00.000Z");
const archiveDir = join(dataDir, "plugin-data", "event-archive");
let cookie: string;

beforeEach(async () => {
  await startPlugins();
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  cookie = (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
});
afterEach(async () => {
  await stopPlugins();
  db.delete(events).run();
  db.delete(pluginState).run();
  rmSync(archiveDir, { recursive: true, force: true });
  vi.useRealTimers();
});
afterAll(() => {
  db.$client.close();
  rmSync(dataDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

function lines(month: string): string[] {
  return readFileSync(join(archiveDir, `events-${month}.jsonl`), "utf8")
    .trimEnd()
    .split("\n");
}

test("archives 2500 events in UTC month files and a second run leaves files unchanged", async () => {
  await enablePlugin("event-archive");
  const old = Array.from({ length: 2500 }, (_, index) => ({
    id: `old-${String(2499 - index).padStart(4, "0")}`,
    ts: new Date(index < 1250 ? "2026-06-30T23:59:59.999Z" : "2026-07-01T00:00:00Z"),
    type: "archive.fixture",
    taskId: "old-task",
    agentId: "old-agent",
    payload: { index },
  }));
  db.transaction((tx) => {
    for (const event of old) tx.insert(events).values(event).run();
    for (const [id, ts] of [
      ["boundary", new Date(now.getTime() - 90 * 86_400_000)],
      ["new", now],
    ] as const) {
      tx.insert(events).values({ id, ts, type: "archive.fixture" }).run();
    }
  });
  const emit = vi.fn();
  const ctx: PluginContext = {
    assistant: { receive: vi.fn(), status: vi.fn() },
    db,
    dataDir: archiveDir,
    config: { keepDays: 90 },
    publicUrl: undefined,
    tasks: { act: vi.fn() },
    events: { emit, on: vi.fn() },
    schedule: vi.fn(),
    registerRoutes: vi.fn(),
  };
  await archive(ctx, eventArchive.configSchema.parse({}), now);
  const june = lines("2026-06");
  const july = lines("2026-07");
  expect(readdirSync(archiveDir)).toEqual(["events-2026-06.jsonl", "events-2026-07.jsonl"]);
  expect([june.length, july.length]).toEqual([1250, 1250]);
  for (const [month, archived] of [
    ["2026-06", june],
    ["2026-07", july],
  ] as const) {
    const parsed = archived.map((line) => eventSchema.parse(JSON.parse(line)));
    expect(parsed.every((event) => event.ts.startsWith(month))).toBe(true);
    expect(parsed.map((event) => event.id)).toEqual(parsed.map((event) => event.id).sort());
  }
  const first = old[1249] as (typeof old)[number];
  expect(JSON.parse(june[0] as string)).toEqual({ ...first, ts: first.ts.toISOString() });
  expect(
    db
      .select()
      .from(events)
      .all()
      .map((event) => event.id)
      .sort(),
  ).toEqual(["boundary", "new"]);
  expect(emit).toHaveBeenCalledExactlyOnceWith({
    type: "archive.events",
    payload: { count: 2500 },
  });
  emit.mockClear();
  await archive(ctx, { keepDays: 90 }, now);
  expect(emit).not.toHaveBeenCalled();
  expect(lines("2026-06")).toEqual(june);
  expect(lines("2026-07")).toEqual(july);
});

test("starts disabled and PATCH changes the scheduled retention boundary", async () => {
  const response = await app.request("/api/v1/plugins", { headers: { Cookie: cookie } });
  expect(await response.json()).toContainEqual(
    expect.objectContaining({ id: "event-archive", enabled: false }),
  );
  expect(db.select().from(pluginState).get()).toBeUndefined();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  await enablePlugin("event-archive");
  db.insert(events)
    .values({
      id: "forty-days",
      ts: new Date(now.getTime() - 40 * 86_400_000),
      type: "archive.fixture",
    })
    .run();
  const loaded = plugins.get("event-archive");
  expect(loaded?.crons[0]?.getPattern()).toBe("0 3 * * *");
  await loaded?.crons[0]?.trigger();
  expect(db.select().from(events).where(eq(events.id, "forty-days")).get()).toBeDefined();
  const patch = await app.request("/api/v1/plugins/event-archive", {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ config: { keepDays: 30 } }),
  });
  expect(patch.status).toBe(200);
  expect(await patch.json()).toMatchObject({ config: { keepDays: 30 } });
  await loaded?.crons[0]?.trigger();
  expect(db.select().from(events).where(eq(events.id, "forty-days")).get()).toBeUndefined();
  expect(lines("2026-09")).toHaveLength(1);
  expect(db.select().from(events).where(eq(events.type, "archive.events")).all()).toEqual([
    expect.objectContaining({ payload: { count: 1 } }),
  ]);
});
