import { expect, test } from "vitest";
import { registerAgent } from "../agents/agents.ts";
import { type Event, onEvent } from "../events/bus.ts";
import { listEvents } from "../events/query.ts";
import { createTask } from "../tasks/store.ts";
import { listRelay, markRelayRead, sendRelay, type Viewer } from "./relay.ts";

function viewer(name: string, capabilities: string[]): Extract<Viewer, { kind: "agent" }> {
  const { agent } = registerAgent({ name, kind: "codex", host: "test", capabilities });
  return { kind: "agent", id: agent.id, capabilities };
}

test("relay visibility respects recipients, capabilities, broadcasts, senders and task filters", () => {
  const sender = viewer("sender", ["coding"]);
  const coder = viewer("coder", ["coding"]);
  const other = viewer("other", []);
  const task = createTask({ title: "消息可见性" }, "human");
  const capability = sendRelay(
    { to: { kind: "capability", value: "coding" }, kind: "note", subject: "能力", taskId: task.id },
    sender.id,
  );
  const broadcast = sendRelay(
    { to: { kind: "broadcast" }, kind: "request", subject: "广播", taskId: task.id },
    sender.id,
  );
  const direct = sendRelay(
    { to: { kind: "agent", id: coder.id }, kind: "deliverable", subject: "指定", taskId: task.id },
    sender.id,
  );
  const unrelated = sendRelay(
    { to: { kind: "agent", id: other.id }, kind: "reply", subject: "其他", replyTo: broadcast.id },
    coder.id,
  );
  const ids = (who: Viewer, box: "inbox" | "sent" | "all", taskId = task.id) =>
    listRelay(who, box, taskId).map((message) => message.id);
  expect(ids(coder, "inbox")).toEqual(
    expect.arrayContaining([capability.id, broadcast.id, direct.id]),
  );
  expect(ids(coder, "inbox")).toHaveLength(3);
  expect(ids(other, "inbox")).toEqual([broadcast.id]);
  expect(ids(sender, "inbox")).toEqual([]);
  expect(ids(sender, "sent")).toHaveLength(3);
  expect(ids(sender, "all")).toEqual(ids(sender, "sent"));
  expect(ids(coder, "all")).toEqual(ids(coder, "inbox"));
  expect(ids({ kind: "human" }, "all")).toHaveLength(3);
  expect(ids({ kind: "human" }, "inbox")).toHaveLength(0);
  expect(ids({ kind: "human" }, "sent")).toHaveLength(0);
  expect(listRelay(other, "inbox").some((message) => message.id === unrelated.id)).toBe(true);
  expect(listRelay(other, "sent").some((message) => message.id === unrelated.id)).toBe(false);
  expect(ids({ kind: "human" }, "all")).not.toContain(unrelated.id);
});

test("read receipts require inbox visibility and are only appended once", () => {
  const sender = viewer("sender", ["coding"]);
  const coder = viewer("coder", ["coding"]);
  const other = viewer("other", []);
  const message = sendRelay(
    { to: { kind: "capability", value: "coding" }, kind: "note", subject: "已读" },
    sender.id,
  );
  const published: Event[] = [];
  const unsubscribe = onEvent("relay.read", (event) => published.push(event));
  expect(markRelayRead(message.id, coder)?.readBy).toEqual([coder.id]);
  expect(markRelayRead(message.id, coder)?.readBy).toEqual([coder.id]);
  expect(markRelayRead(message.id, other)).toBeUndefined();
  expect(markRelayRead(message.id, sender)).toBeUndefined();
  expect(markRelayRead("missing-message", coder)).toBeUndefined();
  expect(published).toHaveLength(1);
  expect(published[0]).toMatchObject({
    type: "relay.read",
    agentId: coder.id,
    payload: { messageId: message.id },
  });
  expect(listEvents({ type: "relay.read", agentId: coder.id })).toEqual(published);
  unsubscribe();
  const direct = sendRelay(
    { to: { kind: "agent", id: coder.id }, kind: "note", subject: "指定" },
    sender.id,
  );
  expect(markRelayRead(direct.id, other)).toBeUndefined();
  expect(markRelayRead(direct.id, coder)?.readBy).toEqual([coder.id]);
  const broadcast = sendRelay(
    { to: { kind: "broadcast" }, kind: "note", subject: "广播" },
    sender.id,
  );
  expect(markRelayRead(broadcast.id, other)?.readBy).toEqual([other.id]);
});
