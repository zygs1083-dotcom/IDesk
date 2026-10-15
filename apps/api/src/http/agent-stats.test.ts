import { agentStatsSchema, registeredAgentSchema } from "@idesk/shared/agent-schemas";
import { taskSchema } from "@idesk/shared/task-schemas";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, expect, test, vi } from "vitest";
import { db } from "../db/client.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
afterEach(() => vi.useRealTimers());

function request(path: string, credential = "", body?: object) {
  return app.request(`/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("agent stats aggregate real task actions across the seven day window", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const now = Date.now();
  vi.setSystemTime(now - 8 * 86_400_000);
  const login = await request("/auth/login", "", { password: "test" });
  const cookie = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
  const registration = await request("/agents", cookie, {
    name: "stats worker",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const { agent, apiKey } = registeredAgentSchema.parse(await registration.json());
  const path = `/agents/${agent.id}/stats`;
  expect((await request(path)).status).toBe(401);
  expect(agentStatsSchema.parse(await (await request(path, cookie)).json())).toEqual({
    completed: 0,
    last7dCompleted: 0,
    handoffs: 0,
    reported: 0,
    avgDurationMs: null,
  });
  for (const [start, duration] of [
    [now - 8 * 86_400_000, 600_000],
    [now - 1_800_000, 1_800_000],
  ] as const) {
    vi.setSystemTime(start);
    const task = taskSchema.parse(
      await (await request("/tasks", apiKey, { title: "stats round" })).json(),
    );
    expect((await request(`/tasks/${task.id}/actions/claim`, apiKey, {})).status).toBe(200);
    vi.setSystemTime(start + duration);
    expect(
      (await request(`/tasks/${task.id}/actions/complete`, apiKey, { result: "done" })).status,
    ).toBe(200);
  }
  const handoffTask = taskSchema.parse(
    await (await request("/tasks", apiKey, { title: "handoff" })).json(),
  );
  expect((await request(`/tasks/${handoffTask.id}/actions/claim`, apiKey, {})).status).toBe(200);
  for (const message of ["first report", "second report"]) {
    expect((await request(`/tasks/${handoffTask.id}/report`, apiKey, { message })).status).toBe(
      200,
    );
  }
  expect(
    (await request(`/tasks/${handoffTask.id}/actions/handoff`, apiKey, { note: "context" })).status,
  ).toBe(200);
  for (const credential of [cookie, apiKey]) {
    const response = await request(path, credential);
    expect(response.status).toBe(200);
    expect(agentStatsSchema.parse(await response.json())).toEqual({
      completed: 2,
      last7dCompleted: 1,
      handoffs: 1,
      reported: 2,
      avgDurationMs: 1_200_000,
    });
  }
  const missing = await request("/agents/missing/stats", apiKey);
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ error: "智能体不存在" });
});
