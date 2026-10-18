import { expect, test } from "vitest";
import { agentActor, registerAgent } from "../agents/agents.ts";
import { listRelay, relaySummary } from "./query.ts";
import { markRelayRead, sendRelay } from "./relay.ts";

test("agent summary counts all inbox recipient modes and reuses visible descendant answers", () => {
  const reader = agentActor(
    registerAgent({ name: "summary reader", kind: "codex", host: "test", capabilities: ["coding"] })
      .agent,
  );
  const sender = agentActor(
    registerAgent({ name: "summary sender", kind: "codex", host: "test", capabilities: [] }).agent,
  );
  const before = relaySummary(reader);
  const requests = [
    { kind: "agent", id: reader.id },
    { kind: "capability", value: "coding" },
    { kind: "broadcast" },
  ] as const;
  const messages = requests.map((to) =>
    sendRelay({ to, kind: "request", subject: "Need reply" }, sender.id),
  );
  sendRelay({ to: { kind: "human" }, kind: "request", subject: "Human only" }, sender.id);
  sendRelay(
    { to: { kind: "agent", id: reader.id }, kind: "request", subject: "Self excluded" },
    reader.id,
  );
  expect(relaySummary(reader)).toEqual({
    unread: before.unread + 3,
    pendingRequests: before.pendingRequests + 3,
  });
  const first = messages[0] as (typeof messages)[number];
  markRelayRead(first.id, reader);
  sendRelay({ replyTo: first.id, kind: "reply", subject: "Answer" }, reader.id);
  expect(relaySummary(reader)).toEqual({
    unread: before.unread + 2,
    pendingRequests: before.pendingRequests + 2,
  });
  expect(relaySummary(reader).pendingRequests).toBe(
    listRelay(reader, "inbox", undefined, { requestStatus: "pending" }).length,
  );
});
