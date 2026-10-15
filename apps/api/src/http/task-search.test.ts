import { taskSchema } from "@idesk/shared/task-schemas";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { z } from "zod";
import { registerAgent } from "../core/agents/agents.ts";
import { createTask, escapeLike, TERMINAL_WINDOW_MS } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { db } from "../db/client.ts";
import { tasks } from "../db/schema.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });

test("task search matches title, body and result and ANDs filters and the history window", async () => {
  const { agent, apiKey } = registerAgent({
    name: "search",
    kind: "codex",
    host: "test",
    capabilities: ["coding"],
  });
  const title = createTask({ title: "部署标题", capabilities: ["coding"] }, "human");
  const body = createTask(
    { title: "正文任务", body: "执行部署", capabilities: ["browser"] },
    "human",
  );
  const result = createTask({ title: "结果任务", capabilities: ["coding"] }, "human");
  createTask({ title: "无关任务" }, "human");
  const actor = { kind: "agent" as const, id: agent.id, capabilities: agent.capabilities };
  actOnTask(result.id, { type: "claim" }, actor);
  actOnTask(result.id, { type: "complete", result: "部署完成" }, actor);
  async function search(query: string) {
    const response = await app.request(`/api/v1/tasks?${query}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.status).toBe(200);
    return z
      .array(taskSchema)
      .parse(await response.json())
      .map((task) => task.id)
      .sort();
  }
  const q = `q=${encodeURIComponent("部署")}`;
  expect(await search(q)).toEqual([title.id, body.id, result.id].sort());
  expect(await search("q=missing")).toEqual([]);
  expect(await search(`${q}&status=done&capability=coding&assignee=${agent.id}`)).toEqual([
    result.id,
  ]);
  expect(await search(`${q}&status=open&capability=coding`)).toEqual([title.id]);
  expect(await search(`${q}&status=done&capability=browser`)).toEqual([]);
  db.update(tasks)
    .set({ updatedAt: new Date(Date.now() - TERMINAL_WINDOW_MS - 1000) })
    .where(eq(tasks.id, result.id))
    .run();
  expect(await search(q)).toEqual([title.id, body.id].sort());
  expect(await search(`${q}&status=done`)).toEqual([result.id]);
  const empty = await app.request("/api/v1/tasks?q=", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  expect(empty.status).toBe(400);
});

test.each([
  ["50%", "进度 50%", "进度 500"],
  ["a_b", "标记 a_b", "标记 axb"],
  ["a\\b", "路径 a\\b", "路径 ab"],
])("search treats %s literally", async (q, matching, unrelated) => {
  const { apiKey } = registerAgent({ name: q, kind: "codex", host: "test", capabilities: [] });
  const task = createTask({ title: matching }, "human");
  createTask({ title: unrelated }, "human");
  const response = await app.request(`/api/v1/tasks?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  expect(response.status).toBe(200);
  expect(
    z
      .array(taskSchema)
      .parse(await response.json())
      .map((task) => task.id),
  ).toEqual([task.id]);
});

test("LIKE escaping preserves plain text and escapes every special character", () => {
  expect(escapeLike("部署")).toBe("部署");
  expect(escapeLike("\\50%_\\")).toBe("\\\\50\\%\\_\\\\");
});
