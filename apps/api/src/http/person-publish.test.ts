import { taskSchema } from "@idesk/shared/task-schemas";
import { beforeEach, expect, test } from "vitest";
import { registerAgent } from "../core/agents/agents.ts";
import { listEvents } from "../core/events/query.ts";
import { createPerson } from "../core/people/people.ts";
import { publishTask } from "../core/tasks/publish.ts";
import { createTask, listTasks } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { newPerson, peopleCookie, peopleRequest } from "./people-fixture.ts";

let cookie: string;
beforeEach(async () => {
  cookie = await peopleCookie();
});
test("human may choose a named publisher while dispatch and actor permissions remain human", async () => {
  const person = await newPerson(cookie, "web publisher");
  const target = registerAgent({ name: "target", kind: "codex", host: "test", capabilities: [] });
  const response = await peopleRequest("/tasks", cookie, "POST", {
    title: "named",
    publisherPersonId: person.id,
    dispatch: { type: "assign", agentId: target.agent.id },
  });
  expect(response.status).toBe(201);
  const task = taskSchema.parse(await response.json());
  expect(task).toMatchObject({
    publisherId: person.id,
    status: "assigned",
    assigneeId: target.agent.id,
  });
  expect(listEvents({ taskId: task.id }).find((e) => e.type === "task.created")).toMatchObject({
    agentId: null,
    payload: { personId: person.id, via: "web" },
  });
});
test("missing people and agent-supplied person ids fail before creating a task", async () => {
  const before = listTasks({}).length;
  expect(
    (
      await peopleRequest("/tasks", cookie, "POST", {
        title: "missing",
        publisherPersonId: "p_missing",
      })
    ).status,
  ).toBe(400);
  const publisher = registerAgent({ name: "agent", kind: "codex", host: "test", capabilities: [] });
  expect(
    (
      await peopleRequest("/tasks", publisher.apiKey, "POST", {
        title: "forged",
        publisherPersonId: "p_missing",
      })
    ).status,
  ).toBe(403);
  expect(listTasks({})).toHaveLength(before);
});
test.each(["web", "feishu", "dingtalk", "wecom"] as const)(
  "person publication via %s records provenance and confirms dispatch without widening later actions",
  (via) => {
    const person = createPerson({ name: `publisher ${via}`, role: "member" });
    const actor = { kind: "person", id: person.id } as const;
    const task = publishTask(
      { title: via },
      actor,
      { type: "recruit", needed: 2 },
      { personId: person.id, via },
    );
    if (task instanceof Error) throw task;
    expect(task).toMatchObject({ publisherId: person.id, status: "recruiting" });
    expect(listEvents({ taskId: task.id }).find((e) => e.type === "task.created")).toMatchObject({
      agentId: null,
      payload: { personId: person.id, via },
    });
    expect(actOnTask(task.id, { type: "cancel_recruit" }, actor)).toBeInstanceOf(Error);
    expect(actOnTask(task.id, { type: "cancel" }, actor)).toMatchObject({ status: "cancelled" });
    expect(listEvents({ taskId: task.id }).find((e) => e.type === "task.cancel")).toMatchObject({
      agentId: null,
      payload: { personId: person.id, from: "recruiting", to: "cancelled" },
    });
    const other = createTask({ title: "someone else" }, "human");
    expect(actOnTask(other.id, { type: "cancel" }, actor)).toBeInstanceOf(Error);
    const own = publishTask({ title: "plain own task" }, actor, undefined, {
      personId: person.id,
      via,
    });
    if (own instanceof Error) throw own;
    expect(actOnTask(own.id, { type: "assign", agentId: "agent" }, actor)).toMatchObject({
      key: "auth.humanOrPublisherOnly",
    });
    expect(actOnTask(own.id, { type: "recruit", needed: 2 }, actor)).toMatchObject({
      key: "auth.humanOrPublisherOnly",
    });
  },
);
