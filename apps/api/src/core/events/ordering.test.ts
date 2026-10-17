import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { decodeTime } from "ulid";
import { afterEach, expect, test, vi } from "vitest";
import { db } from "../../db/client.ts";
import { emitEvent, recordEvent } from "./bus.ts";
import { listEvents } from "./query.ts";

migrate(db, { migrationsFolder: new URL("../../../drizzle", import.meta.url).pathname });
afterEach(() => vi.useRealTimers());

test("frozen time emission and transaction order survives since batches and clock rollback", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-01"));
  const created = Array.from({ length: 205 }, () => emitEvent({ type: "ordering.created" }));
  const transaction = db.transaction((tx) => [
    recordEvent(tx, { type: "ordering.created" }),
    recordEvent(tx, { type: "ordering.created" }),
  ]);
  vi.setSystemTime(new Date("2029-12-31"));
  created.push(...transaction, emitEvent({ type: "ordering.created" }));
  const ids = created.map((event) => event.id);
  expect(ids).toEqual([...ids].sort());
  expect(new Set(ids).size).toBe(ids.length);
  const first = listEvents({ since: ids[0] as string, type: "ordering.created" });
  const second = listEvents({ since: first.at(-1)?.id as string, type: "ordering.created" });
  expect([...first, ...second].map((event) => event.id)).toEqual(ids.slice(1));
});

test("a restarted generator begins beyond the stored maximum even with an earlier clock", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2031-01-01"));
  const previous = emitEvent({ type: "restart.created" });
  vi.resetModules();
  const restarted = await import("./bus.ts");
  const sameMillisecond = restarted.emitEvent({ type: "restart.created" });
  expect(sameMillisecond.id > previous.id).toBe(true);
  expect(decodeTime(sameMillisecond.id)).toBe(decodeTime(previous.id) + 1);
  vi.resetModules();
  vi.setSystemTime(new Date("2030-12-31"));
  const rolledBack = (await import("./bus.ts")).emitEvent({ type: "restart.created" });
  expect(rolledBack.id > sameMillisecond.id).toBe(true);
  expect(decodeTime(rolledBack.id)).toBe(decodeTime(sameMillisecond.id) + 1);
});
