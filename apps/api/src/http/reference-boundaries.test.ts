import { expect, test } from "vitest";
import { deleteAgent, registerAgent } from "../core/agents/agents.ts";
import { sendRelay } from "../core/relay/relay.ts";
import { createTask, getTask, listTasks } from "../core/tasks/store.ts";
import { app } from "./app.ts";

function agent() {
  return registerAgent({ name: "references", kind: "codex", host: "test", capabilities: [] });
}
function post(path: string, credential: string, body: object) {
  return app.request(`/api/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": "en",
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
    },
    body: JSON.stringify(body),
  });
}

test("REST rejects missing assignment targets and humans recover deleted assignees", async () => {
  const login = await post("/auth/login", "", { password: "test" });
  const cookie = login.headers.get("Set-Cookie") as string;
  const owner = agent();
  const next = agent();
  const task = createTask({ title: "REST recovery" }, owner.agent.id);
  const act = (type: string, body: object, credential = cookie) =>
    post(`/tasks/${task.id}/actions/${type}`, credential, body);
  const missing = await act("assign", { agentId: "missing" });
  expect(missing.status).toBe(409);
  expect(await missing.json()).toEqual({ error: "Agent not found" });
  expect((await act("assign", { agentId: owner.agent.id })).status).toBe(200);
  expect((await act("release", {}, owner.apiKey)).status).toBe(409);
  expect((await act("assign", { agentId: next.agent.id }, owner.apiKey)).status).toBe(409);
  expect((await act("assign", { agentId: next.agent.id })).status).toBe(200);
  expect((await act("accept", {}, owner.apiKey)).status).toBe(409);
  deleteAgent(next.agent.id);
  expect((await act("release", {})).status).toBe(200);
  expect(getTask(task.id)).toMatchObject({ status: "open", assigneeId: null });
  expect((await act("assign", { agentId: owner.agent.id })).status).toBe(200);
  expect((await act("accept", {}, owner.apiKey)).status).toBe(200);
  const handoff = await act("handoff", { to: "missing", note: "context" }, owner.apiKey);
  expect(handoff.status).toBe(409);
  expect(await handoff.json()).toEqual({ error: "Agent not found" });
  expect(getTask(task.id)).toMatchObject({ status: "in_progress", assigneeId: owner.agent.id });
  const published = await post("/tasks", cookie, {
    title: "missing dispatch target",
    dispatch: { type: "assign", agentId: "missing" },
  });
  expect(published.status).toBe(409);
  expect(listTasks({ q: "missing dispatch target" })).toEqual([
    expect.objectContaining({ status: "open", assigneeId: null }),
  ]);
});

test("REST relay returns identical 404s for absent and invisible reply parents", async () => {
  const sender = agent();
  const recipient = agent();
  const outsider = agent();
  const parent = sendRelay(
    { to: { kind: "agent", id: recipient.agent.id }, kind: "note", subject: "private" },
    sender.agent.id,
  );
  for (const [references, error] of [
    [{ to: { kind: "agent", id: "missing" } }, "Agent not found"],
    [{ taskId: "missing" }, "Task not found"],
    [{ replyTo: "missing" }, "Message not found"],
    [{ replyTo: parent.id }, "Message not found"],
  ] as const) {
    const response = await post("/relay", outsider.apiKey, {
      to: { kind: "broadcast" },
      kind: "reply",
      subject: "reply",
      ...references,
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error });
  }
  expect(
    (
      await post("/relay", recipient.apiKey, {
        to: { kind: "broadcast" },
        kind: "reply",
        subject: "valid",
        replyTo: parent.id,
      })
    ).status,
  ).toBe(201);
});
