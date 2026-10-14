import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { env } from "../env.js";
import { getDb, schema } from "../db/index.js";
import { safeEqual, sha256, verifySessionToken } from "../lib/crypto.js";
import { forbidden, unauthorized } from "../lib/http-error.js";
import type { Actor, AppEnv } from "./actor.js";

export const SESSION_COOKIE = "idesk_session";
const LAST_SEEN_THROTTLE_MS = 30_000;

/** Resolves the caller into an Actor (owner / agent) or null. Never throws. */
export const authenticate: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("actor", resolveActor(c.req.header("authorization"), getCookie(c, SESSION_COOKIE)));
  await next();
};

export function resolveActor(authorization: string | undefined, sessionCookie: string | undefined): Actor | null {
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) {
    if (env.IDESK_ADMIN_TOKEN && safeEqual(bearer, env.IDESK_ADMIN_TOKEN)) return { kind: "owner" };
    const db = getDb();
    const agent = db.select().from(schema.agents).where(eq(schema.agents.apiKeyHash, sha256(bearer))).get();
    if (!agent || agent.disabled) return null;
    touchAgent(agent);
    return { kind: "agent", agent };
  }
  if (verifySessionToken(sessionCookie)) return { kind: "owner" };
  return null;
}

function touchAgent(agent: typeof schema.agents.$inferSelect) {
  const now = Date.now();
  if (agent.lastSeenAt && now - agent.lastSeenAt.getTime() < LAST_SEEN_THROTTLE_MS) return;
  const presence = agent.presence === "offline" ? "online" : agent.presence;
  getDb()
    .update(schema.agents)
    .set({ lastSeenAt: new Date(now), presence })
    .where(eq(schema.agents.id, agent.id))
    .run();
  agent.lastSeenAt = new Date(now);
  agent.presence = presence;
}

export const requireActor: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get("actor")) unauthorized("Login or provide an agent API key");
  await next();
};

export const requireOwner: MiddlewareHandler<AppEnv> = async (c, next) => {
  const actor = c.get("actor");
  if (!actor) unauthorized();
  if (actor.kind !== "owner") forbidden("Owner only");
  await next();
};

export const requireAgent: MiddlewareHandler<AppEnv> = async (c, next) => {
  const actor = c.get("actor");
  if (!actor) unauthorized();
  if (actor.kind !== "agent") forbidden("Agent API key required");
  await next();
};

export function getActor(c: { get(key: "actor"): Actor | null }): Actor {
  const actor = c.get("actor");
  if (!actor) unauthorized();
  return actor;
}
