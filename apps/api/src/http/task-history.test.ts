import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { registerAgent } from "../core/agents/agents.ts";
import { createTask } from "../core/tasks/store.ts";
import { db } from "../db/client.ts";
import { tasks } from "../db/schema.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
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
  do {
    const response = await read(
      `status=done&q=archive%20needle&limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    expect(response.status).toBe(200);
    const page = (await response.json()) as { items: { id: string }[]; nextCursor: string | null };
    expect(page.items.length).toBeLessThanOrEqual(2);
    found.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
  } while (cursor);
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
