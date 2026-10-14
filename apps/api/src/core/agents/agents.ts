import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { type AGENT_KINDS, agents } from "../../db/schema.ts";
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
    const event = recordEvent(tx, { type: "agent.registered", agentId: agent.id, payload: {} });
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
