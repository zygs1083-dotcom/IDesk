import { createHash, randomBytes } from "node:crypto";
import type { AGENT_KINDS, patchAgentSchema } from "@idesk/shared/agent-schemas";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.ts";
import { agents } from "../../db/schema.ts";
import { publishEvent, recordEvent } from "../events/bus.ts";

type Agent = typeof agents.$inferSelect;
export type AgentKind = (typeof AGENT_KINDS)[number];
export type PublicAgent = Omit<Agent, "apiKeyHash"> & { status: "online" | "offline" };

function toPublic(row: Agent, now: Date): PublicAgent {
  const { apiKeyHash, ...agent } = row;
  return {
    ...agent,
    status:
      agent.lastSeenAt !== null && now.getTime() - agent.lastSeenAt.getTime() <= 120_000
        ? "online"
        : "offline",
  };
}

export function registerAgent(input: {
  name: string;
  kind: AgentKind;
  host: string;
  capabilities: string[];
  webhookUrl?: string;
}): { agent: PublicAgent; apiKey: string } {
  const now = new Date();
  const apiKey = `idk_${randomBytes(32).toString("base64url")}`;
  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
  const { agent, event } = db.transaction((tx) => {
    const agent = tx
      .insert(agents)
      .values({ ...input, apiKeyHash, createdAt: now })
      .returning()
      .get();
    const event = recordEvent(tx, {
      type: "agent.registered",
      agentId: agent.id,
      payload: { name: agent.name, kind: agent.kind },
    });
    return { agent, event };
  });
  publishEvent(event);
  return { agent: toPublic(agent, now), apiKey };
}

export function authenticateAgent(apiKey: string): PublicAgent | undefined {
  const now = new Date();
  const hash = createHash("sha256").update(apiKey).digest("hex");
  const agent = db
    .update(agents)
    .set({ lastSeenAt: now })
    .where(eq(agents.apiKeyHash, hash))
    .returning()
    .get();
  return agent && toPublic(agent, now);
}

export function listAgents(): PublicAgent[] {
  const now = new Date();
  return db
    .select()
    .from(agents)
    .all()
    .map((agent) => toPublic(agent, now));
}

export function updateAgent(
  id: string,
  input: z.infer<typeof patchAgentSchema>,
): PublicAgent | undefined {
  const result = db.transaction((tx) => {
    const agent = Object.keys(input).length
      ? tx.update(agents).set(input).where(eq(agents.id, id)).returning().get()
      : tx.select().from(agents).where(eq(agents.id, id)).get();
    if (!agent) return undefined;
    const event = recordEvent(tx, {
      type: "agent.updated",
      agentId: id,
      payload: { name: agent.name, kind: agent.kind },
    });
    return { agent, event };
  });
  if (!result) return undefined;
  publishEvent(result.event);
  return toPublic(result.agent, new Date());
}

export function deleteAgent(id: string): PublicAgent | undefined {
  const result = db.transaction((tx) => {
    const agent = tx.delete(agents).where(eq(agents.id, id)).returning().get();
    if (!agent) return undefined;
    const event = recordEvent(tx, {
      type: "agent.deleted",
      payload: { id, name: agent.name, kind: agent.kind },
    });
    return { agent, event };
  });
  if (!result) return undefined;
  publishEvent(result.event);
  return toPublic(result.agent, new Date());
}
