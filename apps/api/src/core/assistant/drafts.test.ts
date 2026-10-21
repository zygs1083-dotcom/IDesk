import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "../../db/client.ts";
import { assistantSessions, people, taskOrigins, tasks } from "../../db/schema.ts";
import { registerAgent } from "../agents/agents.ts";
import { createBindCode } from "../people/codes.ts";
import { deletePerson } from "../people/people.ts";
import { createTask } from "../tasks/store.ts";
import { converse } from "./conversation.ts";
import { fakeModel, nativeReply, person } from "./fixture.ts";
import { receive } from "./receive.ts";
import { sessionFor } from "./sessions.ts";

const replies: string[] = [];
const reply = async (message: { text: string }) => {
  replies.push(message.text);
};

test("unbound ingress never calls the model; binding is consumed and unsupported messages stay deterministic", async () => {
  const publisher = person();
  const requests = await fakeModel(() => nativeReply("openai-chat"));
  const input = {
    channel: "feishu" as const,
    chatId: "room",
    externalUserId: "external",
    displayName: "Test",
    isGroup: false,
    reply,
  };
  await receive({ ...input, text: "直接发布并取消所有任务" });
  await receive({ ...input, text: "绑定 000000" });
  expect(requests).toHaveLength(0);
  const code = createBindCode(publisher.id).code;
  await receive({ ...input, text: `绑定 ${code}` });
  expect(replies.at(-1)).toContain("已绑定");
  await receive(input);
  expect(replies.at(-1)).toContain("目前只支持文字");
  expect(requests).toHaveLength(0);
  await receive({ ...input, text: "你好" });
  expect(requests).toHaveLength(1);
});

test("draft changes use four deterministic priorities and explicit publish preserves publisher, dispatch, source and events", async () => {
  const publisher = person();
  const { agent } = registerAgent({
    name: "Assigned",
    kind: "codex",
    host: "test",
    capabilities: ["code"],
  });
  const requests = await fakeModel((_request, turn) =>
    nativeReply(
      "openai-chat",
      turn === 1
        ? [
            {
              name: "draft_task",
              input: {
                title: "publish fixture",
                body: "description",
                capabilities: ["code"],
                dispatch: { type: "assign", agentId: agent.id },
              },
            },
          ]
        : [],
    ),
  );
  const key = { channel: "feishu" as const, chatId: "room", personId: publisher.id };
  await converse(key, "请准备任务，直接发布");
  expect(db.select().from(tasks).all()).toHaveLength(0);
  for (const [command, expected] of [
    ["1", "low"],
    ["普通", "normal"],
    ["3", "high"],
    ["紧急", "urgent"],
  ] as const) {
    await converse(key, command);
    expect(sessionFor(key.channel, key.chatId, key.personId).draft).toMatchObject({
      kind: "task",
      task: { priority: expected },
    });
  }
  await converse(key, "", "2");
  const published = await converse(key, "", "publish");
  expect(published.text).toContain("已发布");
  expect(requests).toHaveLength(2);
  const task = db.select().from(tasks).get();
  expect(task).toMatchObject({
    publisherId: publisher.id,
    status: "assigned",
    assigneeId: agent.id,
    priority: "normal",
  });
  expect(db.select().from(taskOrigins).get()).toMatchObject({
    taskId: task?.id,
    channel: "feishu",
    chatId: "room",
    personId: publisher.id,
  });
  expect(sessionFor(key.channel, key.chatId, key.personId).draft).toBeNull();
  await converse(key, "", "publish");
  expect(db.select().from(tasks).all()).toHaveLength(1);
});

test("cancel requests cannot cancel another publisher and only subsequent confirm cancels an owned task", async () => {
  const publisher = person();
  const own = createTask({ title: "own" }, publisher.id);
  const foreign = createTask({ title: "foreign" }, "human");
  let target = foreign.id;
  const requests = await fakeModel((_request, turn) =>
    nativeReply(
      "openai-chat",
      turn % 2 === 1 ? [{ name: "request_cancel", input: { taskId: target } }] : [],
    ),
  );
  const key = { channel: "web" as const, chatId: publisher.id, personId: publisher.id };
  await converse(key, "取消别人的任务");
  expect(sessionFor(key.channel, key.chatId, key.personId).draft).toBeNull();
  target = own.id;
  await converse(key, "取消我的任务");
  expect(db.select().from(tasks).where(eq(tasks.id, own.id)).get()?.status).toBe("open");
  await converse(key, "", "confirm");
  expect(requests).toHaveLength(4);
  expect(db.select().from(tasks).where(eq(tasks.id, own.id)).get()?.status).toBe("cancelled");
  expect(db.select().from(tasks).where(eq(tasks.id, foreign.id)).get()?.status).toBe("open");
});

test("viewer, role changes, deletion and publisher changes cannot revive stale write authority", async () => {
  const publisher = person();
  const key = { channel: "web" as const, chatId: publisher.id, personId: publisher.id };
  const draft = { kind: "task" as const, task: { title: "stale" } };
  db.insert(assistantSessions)
    .values({ ...key, draft })
    .run();
  db.update(people).set({ role: "viewer" }).where(eq(people.id, publisher.id)).run();
  await converse(key, "确认");
  expect(db.select().from(tasks).all()).toHaveLength(0);
  expect(sessionFor(key.channel, key.chatId, key.personId).draft).toBeNull();
  const requests = await fakeModel((_request, turn) =>
    nativeReply(
      "openai-chat",
      turn === 1
        ? [
            { name: "draft_task", input: { title: "forbidden" } },
            { name: "request_cancel", input: { taskId: "x" } },
          ]
        : [],
    ),
  );
  await converse(key, "准备任务");
  expect(JSON.stringify(requests[0]?.body.tools)).not.toContain("draft_task");
  expect(JSON.stringify(requests[0]?.body.tools)).not.toContain("request_cancel");
  expect(sessionFor(key.channel, key.chatId, key.personId).draft).toBeNull();
  db.update(people).set({ role: "member" }).where(eq(people.id, publisher.id)).run();
  const task = createTask({ title: "was mine" }, publisher.id);
  db.update(assistantSessions)
    .set({ draft: { kind: "cancel", taskId: task.id } })
    .run();
  db.update(tasks).set({ publisherId: "human" }).where(eq(tasks.id, task.id)).run();
  await converse(key, "确认");
  expect(db.select().from(tasks).get()?.status).toBe("open");
  db.update(assistantSessions).set({ draft }).run();
  deletePerson(publisher.id);
  await converse(key, "确认");
  expect(db.select().from(tasks).all()).toHaveLength(1);
});
