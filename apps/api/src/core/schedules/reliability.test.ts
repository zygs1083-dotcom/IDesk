import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { db } from "../../db/client.ts";
import { events, schedules } from "../../db/schema.ts";
import { stopSchedules, syncSchedule } from "../../scheduler/schedules.ts";
import { scheduleEvents } from "./events.ts";
import { publicSchedule } from "./public.ts";
import { runSchedule } from "./run.ts";
import { createSchedule, deleteSchedule, getSchedule } from "./schedules.ts";

beforeEach(() => {
  db.delete(schedules).run();
  db.delete(events).run();
});
afterEach(() => {
  stopSchedules();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function fixture() {
  return createSchedule({
    name: "Secret HTTP",
    cron: "* * * * * *",
    timezone: "UTC",
    enabled: true,
    action: {
      type: "http",
      url: "https://example.test/private",
      method: "POST",
      headers: { Authorization: "secret" },
      body: "private-body",
    },
  });
}

test("HTTP times out at 30 seconds with safe errors and paired timing, then can run again", async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new Error("https://example.test/private secret private-body")),
      ms,
    );
    return controller.signal;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => reject(options.signal?.reason));
        }),
    ),
  );
  const row = fixture();
  const pending = runSchedule(row.id);
  expect(publicSchedule(row).running).toBe(true);
  await vi.advanceTimersByTimeAsync(29_999);
  expect(scheduleEvents(row.id)).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);
  expect((await pending)?.lastStatus).toBe("failed");
  expect(AbortSignal.timeout).toHaveBeenCalledWith(30_000);
  const recorded = scheduleEvents(row.id);
  expect(recorded).toHaveLength(2);
  expect(recorded[0]?.payload).toMatchObject({
    error: "HTTP request failed",
    durationMs: 30_000,
    runId: recorded[1]?.payload.runId,
    startedAt: recorded[1]?.payload.startedAt,
  });
  expect(JSON.stringify(recorded)).not.toMatch(/example.test|private-body|Authorization/);
  expect(publicSchedule(row).running).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
  expect((await runSchedule(row.id))?.lastStatus).toBe("failed");
  expect(
    scheduleEvents(row.id).find((event) => event.type === "schedule.fired")?.payload.error,
  ).toBe("HTTP 503");
});

test("manual and cron share the lock, different IDs run, and deletion cannot resurrect a schedule", async () => {
  vi.useFakeTimers();
  let finish!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(new Response());
  vi.stubGlobal("fetch", fetcher);
  const row = fixture();
  const other = fixture();
  const pending = runSchedule(row.id);
  await expect(runSchedule(row.id)).rejects.toMatchObject({ status: 409, key: "schedule.running" });
  syncSchedule(row);
  await vi.advanceTimersByTimeAsync(1_100);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await runSchedule(other.id);
  expect(fetcher).toHaveBeenCalledTimes(2);
  deleteSchedule(row.id);
  finish(new Response());
  expect(await pending).toBeUndefined();
  expect(getSchedule(row.id)).toBeUndefined();
  expect(publicSchedule(row).running).toBe(false);
  expect(scheduleEvents(row.id)).toHaveLength(2);
  expect(scheduleEvents(row.id).every((event) => event.payload.scheduleId === row.id)).toBe(true);
});

test("execution history filters before limiting to the newest 50 events", async () => {
  const row = fixture();
  for (let i = 0; i < 60; i++)
    db.insert(events)
      .values({
        type: "schedule.fired",
        payload: { scheduleId: row.id, name: row.name },
        ts: new Date(i * 1000),
      })
      .run();
  db.insert(events)
    .values({ ts: new Date(), type: "schedule.fired", payload: { scheduleId: "other" } })
    .run();
  db.insert(events)
    .values({ ts: new Date(), type: "task.created", payload: { scheduleId: row.id } })
    .run();
  const recorded = scheduleEvents(row.id);
  expect(recorded).toHaveLength(50);
  expect(recorded[0]?.ts.getTime()).toBe(59_000);
  expect(recorded[49]?.ts.getTime()).toBe(10_000);
});
