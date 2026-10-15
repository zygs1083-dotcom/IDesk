import { taskSchema } from "@idesk/shared/task-schemas";
import { expect, test } from "vitest";
import { authenticateAgent, registerAgent } from "../core/agents/agents.ts";
import { onEvent } from "../core/events/bus.ts";
import { createTask, getTask, listTasks } from "../core/tasks/store.ts";
import { cookie } from "../plugins/host-fixture.ts";
import { app } from "./app.ts";

function agent(name: string) {
  return registerAgent({ name, kind: "codex", host: "test", capabilities: [] });
}
function publish(body: object, headers: Record<string, string> = { Cookie: cookie }) {
  return app.request("/api/v1/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("human publishes and assigns synchronously after task.created", async () => {
  const target = agent("assigned").agent;
  const seen: string[] = [];
  const unsubscribe = onEvent("*", (event) => seen.push(event.type));
  const response = await publish({
    title: "assigned",
    dispatch: { type: "assign", agentId: target.id },
  });
  unsubscribe();
  expect(response.status).toBe(201);
  expect(taskSchema.parse(await response.json())).toMatchObject({
    status: "assigned",
    assigneeId: target.id,
    publisherId: "human",
  });
  expect(seen).toEqual(["task.created", "task.assign"]);
});

test("human publishes recruitment", async () => {
  const response = await publish({ title: "recruit", dispatch: { type: "recruit", needed: 2 } });
  expect(response.status).toBe(201);
  expect(taskSchema.parse(await response.json())).toMatchObject({
    status: "recruiting",
    recruit: { needed: 2, joined: [] },
  });
});

test("invalid recruitment creates no task", async () => {
  const before = listTasks({}).length;
  const response = await publish({ title: "invalid", dispatch: { type: "recruit", needed: 1 } });
  expect(response.status).toBe(400);
  expect(listTasks({})).toHaveLength(before);
});

test("rejected dispatch returns English 409 and leaves the created task open", async () => {
  const blocker = createTask({ title: "blocker" }, "human");
  const response = await publish(
    {
      title: "blocked publication",
      blockedBy: [blocker.id],
      dispatch: { type: "assign", agentId: agent("blocked").agent.id },
    },
    { Cookie: cookie, "Accept-Language": "en" },
  );
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "Blocked by “blocker”" });
  expect(listTasks({ q: "blocked publication" })).toEqual([
    expect.objectContaining({ status: "open", assigneeId: null }),
  ]);
});

test.each(["assign", "recruit"] as const)("agent publisher may %s", async (type) => {
  const publisher = agent("publisher");
  const target = agent("target");
  const dispatch = type === "assign" ? { type, agentId: target.agent.id } : { type, needed: 2 };
  const response = await publish(
    { title: type, dispatch },
    {
      Authorization: `Bearer ${publisher.apiKey}`,
    },
  );
  expect(response.status).toBe(201);
  expect(taskSchema.parse(await response.json())).toMatchObject({
    publisherId: publisher.agent.id,
    status: type === "assign" ? "assigned" : "recruiting",
  });
});

test("explicit dispatch wins over enabled auto-assign", async () => {
  authenticateAgent(agent("automatic candidate").apiKey);
  const target = agent("explicit offline target").agent;
  const enabled = await app.request("/api/v1/plugins/auto-assign/enable", {
    method: "POST",
    headers: { Cookie: cookie },
  });
  expect(enabled.status).toBe(200);
  const response = await publish({
    title: "explicit",
    dispatch: { type: "assign", agentId: target.id },
  });
  expect(response.status).toBe(201);
  const task = taskSchema.parse(await response.json());
  await Promise.resolve();
  expect(getTask(task.id)).toMatchObject({ status: "assigned", assigneeId: target.id });
});
