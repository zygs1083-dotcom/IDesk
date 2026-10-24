import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "../../db/client.ts";
import { relayMessages } from "../../db/schema.ts";
import { registerAgent } from "../agents/agents.ts";
import { createTask } from "../tasks/store.ts";
import { getRelay, listRelay, relayThread } from "./query.ts";
import { sendRelay, type Viewer } from "./relay.ts";

function agent(): Extract<Viewer, { kind: "agent" }> {
  const { agent } = registerAgent({
    name: "reader",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  return { kind: "agent", id: agent.id, capabilities: [] };
}

test("stable pages preserve timestamp order and filter visibility/search before limit", () => {
  const reader = agent();
  const other = agent();
  const task = createTask({ title: "paged relay" }, "human");
  const sent = Array.from({ length: 125 }, (_, i) => {
    const message = sendRelay(
      {
        to: { kind: "agent", id: reader.id },
        kind: "note",
        subject: `page ${i}`,
        body: "50%_\\",
        taskId: task.id,
      },
      "human",
    );
    db.update(relayMessages)
      .set({ createdAt: new Date(100000 + (i % 7)) })
      .where(eq(relayMessages.id, message.id))
      .run();
    return message.id;
  });
  for (let i = 0; i < 60; i++)
    sendRelay({ to: { kind: "agent", id: other.id }, kind: "note", subject: "invisible" }, "human");
  const expected = listRelay(reader, "inbox", task.id);
  expect(expected.map((message) => message.id)).toEqual(
    sent
      .map((id, index) => ({ id, time: index % 7 }))
      .sort((a, b) => b.time - a.time || b.id.localeCompare(a.id))
      .map(({ id }) => id),
  );
  const seen: string[] = [];
  let before: string | undefined;
  for (;;) {
    const page = listRelay(reader, "inbox", undefined, {
      limit: 50,
      ...(before ? { before } : {}),
      q: "50%_\\",
      kind: "note",
      toKind: "agent",
      hasTask: "true",
    });
    seen.push(...page.map((message) => message.id));
    if (page.length < 50) break;
    before = page.at(-1)?.id;
  }
  expect(seen).toEqual(expected.map((message) => message.id));
  expect(new Set(seen).size).toBe(sent.length);
  expect(listRelay(reader, "inbox", undefined, { q: "50x", limit: 1 })).toEqual([]);
  expect(listRelay(reader, "inbox", undefined, { hasTask: "false", toKind: "agent" })).toEqual([]);
  expect(() => listRelay(other, "all", undefined, { before: sent[0] as string })).toThrow(
    "消息不存在",
  );
});

test("threads ignore list pages and searches but never cross hidden parents", () => {
  const a = agent();
  const b = agent();
  const c = agent();
  const root = sendRelay(
    { to: { kind: "agent", id: b.id }, kind: "request", subject: "private root" },
    a.id,
  );
  const reply = sendRelay(
    { to: { kind: "agent", id: c.id }, kind: "reply", subject: "visible child", replyTo: root.id },
    b.id,
  );
  const child = sendRelay(
    { to: { kind: "agent", id: b.id }, kind: "reply", subject: "grandchild", replyTo: reply.id },
    c.id,
  );
  for (const [index, message] of [root, reply, child].entries()) {
    db.update(relayMessages)
      .set({ createdAt: new Date(200000 + index) })
      .where(eq(relayMessages.id, message.id))
      .run();
  }
  expect(relayThread(child.id, b).map((message) => message.id)).toEqual([
    root.id,
    reply.id,
    child.id,
  ]);
  expect(relayThread(child.id, c).map((message) => message.id)).toEqual([reply.id, child.id]);
  expect(() => getRelay(root.id, c)).toThrow("消息不存在");
  expect(() => relayThread(root.id, c)).toThrow("消息不存在");
  expect(relayThread(root.id, { kind: "human" })).toHaveLength(3);
});

test("threads order equal timestamps by ID regardless of insertion order", () => {
  const reader = agent();
  const root = "00000000000000000000000003";
  const reply = "00000000000000000000000001";
  const child = "00000000000000000000000002";
  db.insert(relayMessages)
    .values(
      [
        { id: root, replyTo: null },
        { id: reply, replyTo: root },
        { id: child, replyTo: reply },
      ].map((message) => ({
        ...message,
        createdAt: new Date(300000),
        fromAgentId: "human",
        to: { kind: "agent" as const, id: reader.id },
        kind: "reply" as const,
        subject: "timestamp tie",
      })),
    )
    .run();
  expect(relayThread(child, reader).map((message) => message.id)).toEqual([reply, child, root]);
});

test("request status counts visible replies by others, including deeper descendants", () => {
  const a = agent();
  const b = agent();
  const c = agent();
  const root = sendRelay({ to: { kind: "broadcast" }, kind: "request", subject: "status" }, a.id);
  const own = sendRelay(
    { to: { kind: "broadcast" }, kind: "reply", subject: "supplement", replyTo: root.id },
    a.id,
  );
  const pending = (viewer: Viewer) =>
    listRelay(viewer, "all", undefined, { requestStatus: "pending", q: "status" }).map((m) => m.id);
  const answered = (viewer: Viewer) =>
    listRelay(viewer, "all", undefined, { requestStatus: "answered", limit: 1, q: "status" }).map(
      (m) => m.id,
    );
  expect(pending(a)).toEqual([root.id]);
  sendRelay(
    { to: { kind: "agent", id: a.id }, kind: "note", subject: "not an answer", replyTo: own.id },
    b.id,
  );
  expect(pending(a)).toEqual([root.id]);
  sendRelay(
    { to: { kind: "agent", id: a.id }, kind: "reply", subject: "answer", replyTo: own.id },
    b.id,
  );
  expect(answered(a)).toEqual([root.id]);
  expect(answered(b)).toEqual([root.id]);
  expect(answered(c)).toEqual([]);
  expect(pending(c)).toEqual([root.id]);
  expect(answered({ kind: "human" })).toEqual([root.id]);
});

test("a visible descendant survives a hidden intermediate reply", () => {
  const a = agent();
  const b = agent();
  const c = agent();
  const root = sendRelay(
    { to: { kind: "broadcast" }, kind: "request", subject: "bridge request" },
    a.id,
  );
  const hidden = sendRelay(
    { to: { kind: "agent", id: b.id }, kind: "note", subject: "hidden bridge", replyTo: root.id },
    a.id,
  );
  const visible = sendRelay(
    {
      to: { kind: "agent", id: c.id },
      kind: "reply",
      subject: "visible answer",
      replyTo: hidden.id,
    },
    b.id,
  );
  expect(
    relayThread(root.id, c)
      .map((m) => m.id)
      .sort(),
  ).toEqual([root.id, visible.id].sort());
  expect(relayThread(visible.id, c).map((m) => m.id)).toEqual([visible.id]);
  expect(
    listRelay(c, "all", undefined, { requestStatus: "answered", q: "bridge request" }).map(
      (m) => m.id,
    ),
  ).toEqual([root.id]);
});

test.each(["%", "_", "\\"])("search treats %s as literal in subject and body", (literal) => {
  const reader = agent();
  const first = sendRelay(
    { to: { kind: "agent", id: reader.id }, kind: "note", subject: `literal ${literal}` },
    "human",
  );
  const second = sendRelay(
    { to: { kind: "agent", id: reader.id }, kind: "note", subject: "body match", body: literal },
    "human",
  );
  sendRelay({ to: { kind: "agent", id: reader.id }, kind: "note", subject: "unrelated" }, "human");
  expect(
    listRelay(reader, "all", undefined, { q: literal })
      .map((m) => m.id)
      .sort(),
  ).toEqual([first.id, second.id].sort());
});

test("thread includes messages older than the first page and outside search", () => {
  const reader = agent();
  const root = sendRelay(
    { to: { kind: "agent", id: reader.id }, kind: "request", subject: "older root" },
    "human",
  );
  const replies = Array.from({ length: 105 }, (_, index) =>
    sendRelay(
      {
        to: { kind: "agent", id: reader.id },
        kind: "reply",
        subject: `new reply ${index}`,
        replyTo: root.id,
      },
      "human",
    ),
  );
  expect(listRelay(reader, "inbox", undefined, { limit: 50, q: "new reply" })).toHaveLength(50);
  expect(relayThread(replies[104]?.id as string, reader)).toHaveLength(106);
});
