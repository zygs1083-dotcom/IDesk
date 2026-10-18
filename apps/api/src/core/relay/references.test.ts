import { expect, test } from "vitest";
import { db } from "../../db/client.ts";
import { events, relayMessages } from "../../db/schema.ts";
import { deleteAgent, registerAgent } from "../agents/agents.ts";
import { listRelay, sendRelay, type Viewer, writeRelay } from "./relay.ts";

function viewer(name: string, capabilities: string[]): Extract<Viewer, { kind: "agent" }> {
  const { agent } = registerAgent({ name, kind: "codex", host: "test", capabilities });
  return { kind: "agent", id: agent.id, capabilities };
}

test("new relay references reject missing targets, tasks and unreadable parents without writes", () => {
  const sender = viewer("reference sender", []);
  const recipient = viewer("reference recipient", []);
  const outsider = viewer("reference outsider", []);
  const privateMessage = sendRelay(
    { to: { kind: "agent", id: recipient.id }, kind: "note", subject: "private" },
    sender.id,
  );
  for (const [references, key] of [
    [{ to: { kind: "agent", id: "missing" } }, "agent.notFound"],
    [{ taskId: "missing" }, "task.notFound"],
    [{ replyTo: "missing" }, "relay.notFound"],
    [{ replyTo: privateMessage.id }, "relay.notFound"],
  ] as const) {
    const beforeMessages = db.select().from(relayMessages).all();
    const beforeEvents = db.select().from(events).all();
    // Exercise the shared transactional writer, including the path used by handoff.
    expect(() =>
      db.transaction((tx) =>
        writeRelay(
          tx,
          {
            to: { kind: "broadcast" },
            kind: "reply",
            subject: "invalid",
            ...references,
          },
          outsider.id,
        ),
      ),
    ).toThrow(expect.objectContaining({ status: 404, key }));
    expect(db.select().from(relayMessages).all()).toEqual(beforeMessages);
    expect(db.select().from(events).all()).toEqual(beforeEvents);
  }
  for (const from of [sender.id, recipient.id, "human"]) {
    expect(
      sendRelay(
        {
          to: { kind: "broadcast" },
          kind: "reply",
          subject: "readable",
          replyTo: privateMessage.id,
        },
        from,
      ),
    ).toMatchObject({ replyTo: privateMessage.id });
  }
});

test("capability replies use current visibility and historical messages survive agent deletion", () => {
  const sender = viewer("historical sender", []);
  const coder = viewer("historical coder", ["coding"]);
  const outsider = viewer("historical outsider", []);
  const parent = sendRelay(
    { to: { kind: "capability", value: "coding" }, kind: "note", subject: "coding" },
    sender.id,
  );
  const reply = {
    to: { kind: "broadcast" } as const,
    kind: "reply" as const,
    subject: "reply",
    replyTo: parent.id,
  };
  expect(() => sendRelay(reply, outsider.id)).toThrow(
    expect.objectContaining({ status: 404, key: "relay.notFound" }),
  );
  expect(sendRelay(reply, coder.id).replyTo).toBe(parent.id);
  const direct = sendRelay(
    { to: { kind: "agent", id: coder.id }, kind: "note", subject: "history" },
    sender.id,
  );
  deleteAgent(sender.id);
  deleteAgent(coder.id);
  expect(listRelay({ kind: "human" }, "all")).toContainEqual(direct);
  expect(listRelay(coder, "inbox")).toContainEqual(direct);
  expect(sendRelay(reply, "human").replyTo).toBe(parent.id);
});
