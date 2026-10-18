import { taskSchema } from "@idesk/shared/task-schemas";
import { afterEach, expect, test } from "vitest";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { listEvents } from "../core/events/query.ts";
import { createTask, getTask } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { app } from "./app.ts";

const originalViewerPassword = config.IDESK_VIEWER_PASSWORD;
afterEach(() => {
  config.IDESK_VIEWER_PASSWORD = originalViewerPassword;
});
async function cookie(password = "test") {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
}
function patch(id: string, credential: string, body: object) {
  return app.request(`/api/v1/tasks/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
    },
    body: JSON.stringify(body),
  });
}
function agent(name: string) {
  return registerAgent({ name, kind: "codex", host: "test", capabilities: ["coding"] });
}

test("publisher edits running task atomically without changing assignment, lease or result", async () => {
  const publisher = agent("edit publisher");
  const worker = agent("edit worker");
  const task = createTask({ title: "before", capabilities: ["coding"] }, publisher.agent.id);
  actOnTask(
    task.id,
    { type: "claim" },
    { kind: "agent", id: worker.agent.id, capabilities: ["coding"] },
  );
  const before = getTask(task.id);
  const dependency = createTask({ title: "dependency" }, "human");
  const input = {
    title: "after",
    body: "private body",
    priority: "high",
    tags: ["tag"],
    capabilities: ["browser"],
    dueAt: "2030-05-06T12:30:00.000Z",
    blockedBy: [dependency.id],
  };
  const response = await patch(task.id, publisher.apiKey, input);
  expect(response.status).toBe(200);
  const updated = taskSchema.parse(await response.json());
  expect(updated).toMatchObject(input);
  expect(getTask(task.id)).toMatchObject({
    status: before?.status,
    assigneeId: before?.assigneeId,
    leaseExpiresAt: before?.leaseExpiresAt,
    recruit: before?.recruit,
    result: before?.result,
  });
  const events = listEvents({ taskId: task.id }).filter((event) => event.type === "task.updated");
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    agentId: publisher.agent.id,
    payload: { fields: expect.arrayContaining(Object.keys(input)) },
  });
  expect(events[0]?.payload.fields).toHaveLength(Object.keys(input).length);
  expect(Object.keys(events[0]?.payload ?? {})).toEqual(["fields"]);
  expect((await patch(task.id, await cookie(), { dueAt: null })).status).toBe(200);
  expect(getTask(task.id)?.dueAt).toBeNull();
});

test("edit permissions, invalid fields and dependency errors leave task and events untouched", async () => {
  const publisher = agent("edit validation publisher");
  const other = agent("edit validation other");
  const task = createTask({ title: "unchanged" }, publisher.agent.id);
  const admin = await cookie();
  config.IDESK_VIEWER_PASSWORD = "viewer-edit";
  const viewer = await cookie("viewer-edit");
  for (const credential of [other.apiKey, viewer])
    expect((await patch(task.id, credential, { title: "denied" })).status).toBe(403);
  for (const input of [
    {},
    { title: "  " },
    { dueAt: "tomorrow" },
    { capabilities: ["not,valid"] },
    { title: "partial", blockedBy: ["missing"] },
    { title: "partial", blockedBy: [task.id] },
    { status: "done", result: "ignored" },
  ]) {
    expect((await patch(task.id, admin, input)).status).toBe(400);
  }
  expect((await patch("missing", admin, { title: "title" })).status).toBe(404);
  expect(getTask(task.id)).toEqual(task);
  expect(listEvents({ taskId: task.id }).filter((event) => event.type === "task.updated")).toEqual(
    [],
  );
});

test("terminal and recruiting tasks remain in their state when details change", async () => {
  const admin = await cookie();
  const task = createTask({ title: "recruiting" }, "human");
  actOnTask(task.id, { type: "recruit", needed: 2 }, { kind: "human" });
  const participant = agent("recruit participant");
  actOnTask(
    task.id,
    { type: "join" },
    { kind: "agent", id: participant.agent.id, capabilities: ["coding"] },
  );
  const before = getTask(task.id);
  expect((await patch(task.id, admin, { capabilities: ["browser"] })).status).toBe(200);
  expect(getTask(task.id)).toMatchObject({ status: "recruiting", recruit: before?.recruit });
  actOnTask(task.id, { type: "cancel" }, { kind: "human" });
  expect((await patch(task.id, admin, { title: "corrected cancelled" })).status).toBe(200);
  expect(getTask(task.id)?.status).toBe("cancelled");
});

test("completed tasks accept corrections without replacing their recorded result", async () => {
  const worker = agent("completed editor");
  const task = createTask({ title: "done title" }, worker.agent.id);
  const actor = { kind: "agent" as const, id: worker.agent.id, capabilities: ["coding"] };
  actOnTask(task.id, { type: "claim" }, actor);
  actOnTask(task.id, { type: "complete", result: "original result" }, actor);
  const completedAt = getTask(task.id)?.completedAt;
  expect(
    (
      await patch(task.id, worker.apiKey, {
        title: "corrected",
        body: "clarification",
        dueAt: null,
      })
    ).status,
  ).toBe(200);
  expect(getTask(task.id)).toMatchObject({
    status: "done",
    completedAt,
    result: "original result",
    body: "clarification",
  });
});
