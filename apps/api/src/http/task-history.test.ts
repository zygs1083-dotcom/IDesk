import { taskSchema } from "@idesk/shared/task-schemas";
import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { z } from "zod";
import { registerAgent } from "../core/agents/agents.ts";
import { createTask } from "../core/tasks/store.ts";
import { db } from "../db/client.ts";
import { tasks } from "../db/schema.ts";
import { app } from "./app.ts";

test("history searches old terminal tasks with stable tied-time pages and preserves old GET shape", async () => {
  const { apiKey } = registerAgent({
    name: "history reader",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const ids: string[] = [];
  for (let i = 0; i < 5; i++) {
    const task = createTask({ title: `history-pagination-${i}`, body: "archive needle" }, "human");
    db.update(tasks)
      .set({ status: "done", updatedAt: new Date("2020-01-01T00:00:00Z") })
      .where(eq(tasks.id, task.id))
      .run();
    ids.push(task.id);
  }
  const cancelled = createTask({ title: "history-pagination-cancelled" }, "human");
  db.update(tasks)
    .set({
      status: "cancelled",
      result: "archive needle",
      updatedAt: new Date("2020-01-01T00:00:00Z"),
    })
    .where(eq(tasks.id, cancelled.id))
    .run();
  const read = (query: string) =>
    app.request(`/api/v1/tasks?${query}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  expect(await (await read("q=history-pagination")).json()).toEqual([]);
  const legacy = (await (await read("status=done&q=history-pagination")).json()) as {
    id: string;
  }[];
  expect(legacy.map((task) => task.id)).toEqual([...ids].sort().reverse());
  let cursor: string | null = null;
  const found: string[] = [];
  const pageSizes: number[] = [];
  do {
    const response = await read(
      `status=done&q=archive%20needle&limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    expect(response.status).toBe(200);
    const page = (await response.json()) as { items: { id: string }[]; nextCursor: string | null };
    pageSizes.push(page.items.length);
    found.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
  } while (cursor);
  expect(pageSizes).toEqual([2, 2, 1]);
  expect(found).toEqual([...ids].sort().reverse());
  const page = await (await read("status=cancelled&q=archive%20needle&limit=2")).json();
  expect(page).toMatchObject({ items: [{ id: cancelled.id }], nextCursor: null });
  for (const query of [
    "limit=2",
    "status=done&limit=0",
    "status=done&limit=101",
    "status=done&limit=2&cursor=bad",
    "status=done&cursor=123%7Cid",
  ]) {
    expect((await read(query)).status).toBe(400);
  }
});

test("old ID matches preserve updatedAt/id ordering across array and paginated history", async () => {
  const { apiKey } = registerAgent({
    name: "ID history",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const newest = "01BX5ZZKBKACTAV9WEVGEMMVRW";
  const tiedHigh = "01BX5ZZKBKACTAV9WEVGEMMVRZ";
  const tiedLow = "01BX5ZZKBKACTAV9WEVGEMMVRY";
  const cancelled = "01BX5ZZKBKACTAV9WEVGEMMVRX";
  const old = new Date("2020-01-01T00:00:00Z");
  const base = { title: "Archived task", publisherId: "human", status: "done" as const };
  db.insert(tasks)
    .values([
      { ...base, id: newest, updatedAt: new Date("2020-01-02T00:00:00Z") },
      { ...base, id: tiedLow, updatedAt: old },
      { ...base, id: tiedHigh, updatedAt: old },
      { ...base, id: cancelled, status: "cancelled", updatedAt: old },
    ])
    .run();
  const read = async (query: Record<string, string>) => {
    const response = await app.request(`/api/v1/tasks?${new URLSearchParams(query)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.status).toBe(200);
    return response.json();
  };
  expect(await read({ q: newest })).toEqual([]);
  expect(
    z
      .array(taskSchema)
      .parse(await read({ q: newest.toLowerCase(), status: "done" }))
      .map((task) => task.id),
  ).toEqual([newest]);
  const query = { q: "wevgemmvr", status: "done" };
  const expected = [newest, tiedHigh, tiedLow];
  expect(
    z
      .array(taskSchema)
      .parse(await read(query))
      .map((task) => task.id),
  ).toEqual(expected);
  const pageSchema = z
    .object({ items: z.array(taskSchema), nextCursor: z.string().nullable() })
    .strict();
  const found: string[] = [];
  let cursor: string | null = null;
  do {
    const page = pageSchema.parse(
      await read({ ...query, limit: "1", ...(cursor ? { cursor } : {}) }),
    );
    expect(page.items).toHaveLength(1);
    found.push(...page.items.map((task) => task.id));
    cursor = page.nextCursor;
    if (found.length === 1)
      expect(cursor).toBe(`${new Date("2020-01-02T00:00:00Z").getTime()}|${newest}`);
    if (found.length === 2) expect(cursor).toBe(`${old.getTime()}|${tiedHigh}`);
    expect(found.length).toBeLessThanOrEqual(expected.length);
  } while (cursor);
  expect(found).toEqual(expected);
  expect(
    z
      .array(taskSchema)
      .parse(await read({ q: cancelled, status: "cancelled" }))
      .map((task) => task.id),
  ).toEqual([cancelled]);
});
