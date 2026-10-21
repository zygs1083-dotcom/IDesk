import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "../../db/client.ts";
import { assistantSessions, people, taskOrigins, tasks } from "../../db/schema.ts";
import { createBindCode } from "../people/codes.ts";
import { getBoundPerson } from "../people/people.ts";
import { converse } from "./conversation.ts";
import { fakeModel, nativeReply, person } from "./fixture.ts";
import { receive } from "./receive.ts";
import { sessionFor } from "./sessions.ts";

test("cancel discards draft, recruit remains a publish-only dispatch, and unknown buttons never invoke the model", async () => {
  const publisher = person();
  const requests = await fakeModel((_request, turn) =>
    nativeReply(
      "openai-chat",
      turn % 2 === 1
        ? [
            {
              name: "draft_task",
              input: { title: "recruit fixture", dispatch: { type: "recruit", needed: 2 } },
            },
          ]
        : [],
    ),
  );
  const key = { channel: "web" as const, chatId: publisher.id, personId: publisher.id };
  await converse(key, "prepare");
  await converse(key, "算了");
  expect(db.select().from(tasks).all()).toHaveLength(0);
  expect(sessionFor("web", publisher.id, publisher.id).draft).toBeNull();
  await converse(key, "", "publish");
  expect(requests).toHaveLength(2);
  await converse(key, "prepare again");
  await converse(key, "发布");
  expect(db.select().from(tasks).get()).toMatchObject({
    status: "recruiting",
    publisherId: publisher.id,
    recruit: { needed: 2, joined: [] },
  });
  expect(db.select().from(taskOrigins).all()).toHaveLength(0);
});

test("an agent deleted after drafting prevents publish without leaving an orphan task", async () => {
  const publisher = person();
  const key = { channel: "web" as const, chatId: publisher.id, personId: publisher.id };
  db.insert(assistantSessions)
    .values({
      ...key,
      draft: {
        kind: "task",
        task: { title: "missing agent", dispatch: { type: "assign", agentId: "deleted" } },
      },
    })
    .run();
  expect((await converse(key, "发布")).text).toContain("未发布");
  expect(db.select().from(tasks).all()).toHaveLength(0);
});

test("bound identities cannot be rebound through chat and failed binding attempts do not call the model", async () => {
  const publisher = person();
  const other = db
    .insert(people)
    .values({ name: "Other member", role: "member" })
    .returning()
    .get();
  const requests = await fakeModel(() => nativeReply("openai-chat"));
  const texts: string[] = [];
  const input = {
    channel: "feishu" as const,
    chatId: "room",
    externalUserId: "external",
    displayName: "Fixture",
    isGroup: false,
    reply: async (message: { text: string }) => {
      texts.push(message.text);
    },
  };
  await receive({ ...input, text: `绑定 ${createBindCode(publisher.id).code}` });
  await receive({ ...input, text: `绑定 ${createBindCode(other.id).code}` });
  expect(texts.at(-1)).toContain("先在网页解绑");
  expect(getBoundPerson("feishu", "external")?.id).toBe(publisher.id);
  expect(requests).toHaveLength(0);
});

test("draft confirmation survives a malformed followup response, and deletion mid-model removes the draft", async () => {
  const publisher = person();
  const key = { channel: "web" as const, chatId: publisher.id, personId: publisher.id };
  let deletion = false;
  await fakeModel((_request, turn) => {
    if (deletion) db.delete(people).where(eq(people.id, publisher.id)).run();
    return turn === 1
      ? nativeReply("openai-chat", [
          { name: "draft_task", input: { title: "confirmation survives" } },
        ])
      : {};
  });
  const reply = await converse(key, "prepare");
  expect(reply.options).toHaveLength(6);
  expect(reply.text).toContain("助理暂时不可用");
  deletion = true;
  expect((await converse(key, "query instead")).options).toBeUndefined();
  expect(db.select().from(assistantSessions).all()).toHaveLength(0);
});

test("binding accepts no-space commands but rejects wrong digit counts and extra text without calling the model", async () => {
  const publisher = person();
  const requests = await fakeModel(() => nativeReply("openai-chat"));
  const code = createBindCode(publisher.id).code;
  const input = {
    channel: "dingtalk" as const,
    chatId: "binding-room",
    externalUserId: "no-space-user",
    displayName: "Fixture",
    isGroup: false,
    reply: async () => {},
  };
  for (const text of [
    "绑定12345",
    "绑定1234567",
    `绑定${code} extra`,
    `绑定 ${code.slice(0, 3)} ${code.slice(3)}`,
  ]) {
    await receive({ ...input, text });
    expect(getBoundPerson(input.channel, input.externalUserId)).toBeUndefined();
  }
  await receive({ ...input, text: `绑定${code}` });
  expect(getBoundPerson(input.channel, input.externalUserId)?.id).toBe(publisher.id);
  expect(requests).toHaveLength(0);
});
