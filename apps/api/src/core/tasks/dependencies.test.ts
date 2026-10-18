import { taskSchema } from "@idesk/shared/task-schemas";
import { afterEach, expect, test, vi } from "vitest";
import { app } from "../../http/app.ts";
import { registerAgent } from "../agents/agents.ts";

afterEach(() => vi.useRealTimers());

function request(path: string, credential: string, body: object, method = "POST") {
  return app.request(`/api/v1${path}`, {
    method,
    headers: {
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
async function human() {
  const response = await request("/auth/login", "", { password: "test" });
  return (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
}
async function publish(credential: string, title: string, blockedBy: string[] = []) {
  const response = await request("/tasks", credential, { title, blockedBy });
  expect(response.status).toBe(201);
  return taskSchema.parse(await response.json());
}

test("unfinished dependencies block claim, assign and recruit until completed or cancelled", async () => {
  vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
  const cookie = await human();
  const { agent, apiKey } = registerAgent({
    name: "dependencies worker",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const a = await publish(cookie, "先完成 A");
  const b = await publish(cookie, "再领取 B", [a.id]);
  for (const [action, credential, body] of [
    ["claim", apiKey, {}],
    ["assign", cookie, { agentId: agent.id }],
    ["recruit", cookie, { needed: 2 }],
  ] as const) {
    const response = await request(`/tasks/${b.id}/actions/${action}`, credential, body);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: `被「${a.title}」阻塞` });
  }
  expect((await request(`/tasks/${a.id}/actions/claim`, apiKey, {})).status).toBe(200);
  expect(
    (await request(`/tasks/${a.id}/actions/complete`, apiKey, { result: "done" })).status,
  ).toBe(200);
  expect((await request(`/tasks/${b.id}/actions/claim`, apiKey, {})).status).toBe(200);
  expect(
    (await request(`/tasks/${b.id}/actions/complete`, apiKey, { result: "done" })).status,
  ).toBe(200);
  const cancelled = await publish(cookie, "可取消的依赖");
  const assigned = await publish(cookie, "取消后可指定", [cancelled.id]);
  const recruited = await publish(cookie, "取消后可招募", [cancelled.id]);
  expect((await request(`/tasks/${cancelled.id}/actions/cancel`, cookie, {})).status).toBe(200);
  expect(
    (await request(`/tasks/${assigned.id}/actions/assign`, cookie, { agentId: agent.id })).status,
  ).toBe(200);
  expect(
    (await request(`/tasks/${recruited.id}/actions/recruit`, cookie, { needed: 2 })).status,
  ).toBe(200);
});

test("dependency patch authorizes humans and publishers, validates ids and records normalized events", async () => {
  vi.setSystemTime(new Date("2020-01-02T00:00:00Z"));
  const cookie = await human();
  const publisher = registerAgent({
    name: "dependency publisher",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const other = registerAgent({
    name: "other publisher",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const a = await publish(cookie, "dependency");
  const b = await publish(publisher.apiKey, "editable");
  const patch = (credential: string, blockedBy: string[], id = b.id) =>
    request(`/tasks/${id}`, credential, { blockedBy }, "PATCH");
  const forbidden = await patch(other.apiKey, [a.id]);
  expect(forbidden.status).toBe(403);
  expect(await forbidden.json()).toEqual({ error: "只有人或发布者可以操作" });
  expect((await patch(cookie, [], "missing-task")).status).toBe(404);
  for (const ids of [["missing"], [b.id]]) expect((await patch(cookie, ids)).status).toBe(400);
  const invalid = await request("/tasks", publisher.apiKey, {
    title: "invalid",
    blockedBy: ["missing-id"],
  });
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ error: "依赖的任务不存在：missing-id" });
  vi.setSystemTime(new Date("2020-01-02T01:00:00Z"));
  const updated = await patch(publisher.apiKey, [a.id, a.id]);
  expect(updated.status).toBe(200);
  expect(await updated.json()).toMatchObject({
    blockedBy: [a.id],
    updatedAt: "2020-01-02T01:00:00.000Z",
  });
  expect((await patch(cookie, [])).status).toBe(200);
  const events = await app.request(`/api/v1/tasks/${b.id}/events`, { headers: { Cookie: cookie } });
  expect(await events.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "task.dependencies",
        agentId: publisher.agent.id,
        payload: { blockedBy: [a.id] },
      }),
      expect.objectContaining({
        type: "task.dependencies",
        agentId: null,
        payload: { blockedBy: [] },
      }),
    ]),
  );
});
