import type { AgentRow } from "../db/schema.js";

export type Actor = { kind: "owner" } | { kind: "agent"; agent: AgentRow };

export type AppEnv = { Variables: { actor: Actor | null } };

export function actorKind(actor: Actor): "human" | "agent" {
  return actor.kind === "owner" ? "human" : "agent";
}
export function actorId(actor: Actor): string | null {
  return actor.kind === "owner" ? null : actor.agent.id;
}
