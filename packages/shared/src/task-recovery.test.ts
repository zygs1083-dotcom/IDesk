import { expect, it } from "vitest";
import { type Actor, type TaskState, TransitionError, transition } from "./task-machine.ts";

const now = new Date("2026-10-14T00:00:00Z");
const agent: Actor = { kind: "agent", id: "owner", capabilities: [] };
const human: Actor = { kind: "human" };
const system: Actor = { kind: "system" };
const other: Actor = { ...agent, id: "other" };
const task: TaskState = {
  status: "assigned",
  publisherId: "publisher",
  assigneeId: "owner",
  capabilities: [],
  recruit: null,
  leaseExpiresAt: now,
  result: null,
  completedAt: null,
};
function ok(result: TaskState | TransitionError): TaskState {
  expect(result).not.toBeInstanceOf(TransitionError);
  return result as TaskState;
}
it("assigned recovery is human-only and clears stale leases", () => {
  const original = task;
  const publisher: Actor = { ...agent, id: "publisher" };
  for (const action of [{ type: "release" }, { type: "assign", agentId: "next" }] as const) {
    for (const actor of [system, publisher, agent, other])
      expect(transition(original, action, actor, now)).toMatchObject({ key: "auth.humanOnly" });
    const recovered = ok(transition(original, action, human, now));
    expect(recovered).toMatchObject({
      status: action.type === "release" ? "open" : "assigned",
      assigneeId: action.type === "release" ? null : "next",
      leaseExpiresAt: null,
    });
    if (action.type === "assign") {
      expect(transition(recovered, { type: "accept" }, agent, now)).toBeInstanceOf(TransitionError);
      expect(
        ok(transition(recovered, { type: "decline" }, { ...agent, id: "next" }, now)).status,
      ).toBe("open");
    }
  }
});
