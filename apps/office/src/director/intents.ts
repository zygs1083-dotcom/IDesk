import type { RelayRecipient } from "@idesk/shared/relay";
import type { OfficeEvent, Task } from "./events.ts";

type OwnedKind = "claim" | "complete" | "pause" | "resume" | "return";
type TeamKind = "meeting" | "disband" | "cancel";
export type Intent =
  | { kind: "create"; task: Task }
  | { [K in OwnedKind]: { kind: K; task: Task; agentId: string } }[OwnedKind]
  | { kind: "handoff"; task: Task; agentId: string; to: string | null }
  | { kind: "report"; agentId: string; message: string }
  | { [K in TeamKind]: { kind: K; task: Task } }[TeamKind]
  | { kind: "relay"; agentId: string; to: RelayRecipient };

type Snapshot = { event: OfficeEvent; task: Task | undefined; previous: Task | undefined };
const owner = ({ event, task, previous }: Snapshot) =>
  event.agentId ?? previous?.assigneeId ?? task?.assigneeId;
const owned = (
  kind: "claim" | "complete" | "pause" | "resume" | "return",
  snapshot: Snapshot,
): Intent[] => {
  const agentId = owner(snapshot);
  return agentId && snapshot.task ? [{ kind, agentId, task: snapshot.task }] : [];
};
const finish = (snapshot: Snapshot): Intent[] => [
  ...owned("complete", snapshot),
  ...(snapshot.task?.recruit ? [{ kind: "disband" as const, task: snapshot.task }] : []),
];

export const intentions: Record<string, (snapshot: Snapshot) => Intent[]> = {
  "task.created": ({ task }) => (task ? [{ kind: "create", task }] : []),
  "task.claim": (snapshot) => owned("claim", snapshot),
  "task.accept": (snapshot) => owned("claim", snapshot),
  "task.join": (snapshot) =>
    snapshot.task?.recruit && snapshot.event.payload.to === "in_progress"
      ? [{ kind: "meeting", task: snapshot.task }]
      : owned("claim", snapshot),
  "task.reported": (snapshot) => {
    const agentId = owner(snapshot);
    return agentId
      ? [{ kind: "report", agentId, message: snapshot.event.payload.message as string }]
      : [];
  },
  "task.handoff": ({ event, task }) =>
    task
      ? [
          {
            kind: "handoff",
            task,
            agentId: event.payload.handoffFrom as string,
            to: event.payload.handoffTo as string | null,
          },
        ]
      : [],
  "task.complete": finish,
  "task.pause": (snapshot) => owned("pause", snapshot),
  "task.resume": (snapshot) => owned("resume", snapshot),
  "task.release": (snapshot) => owned("return", snapshot),
  "task.lease_expired": (snapshot) => owned("return", snapshot),
  "task.cancel": ({ task }) =>
    task
      ? [
          { kind: "cancel", task },
          { kind: "disband", task },
        ]
      : [],
  "task.heartbeat": () => [],
  "relay.sent": ({ event }) => [
    { kind: "relay", agentId: event.agentId ?? "human", to: event.payload.to as RelayRecipient },
  ],
};
