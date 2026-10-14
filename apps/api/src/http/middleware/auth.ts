import type { Actor } from "@idesk/shared/task-machine";
import { getSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { config } from "../../config.ts";
import { authenticateAgent, type PublicAgent } from "../../core/agents/agents.ts";
import { HttpError } from "../errors.ts";

export type AuthEnv = {
  Variables: {
    actor: Exclude<Actor, { kind: "system" }>;
    agent: PublicAgent;
  };
};
export const auth = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.req.path === "/api/v1/auth/login" && c.req.method === "POST") return next();
  const authorization = c.req.header("Authorization");
  if (authorization?.startsWith("Bearer ")) {
    const agent = authenticateAgent(authorization.slice(7));
    if (!agent) throw new HttpError(401, "key 无效");
    c.set("agent", agent);
    c.set("actor", { kind: "agent", id: agent.id, capabilities: agent.capabilities });
  } else {
    const session = await getSignedCookie(c, config.IDESK_SESSION_SECRET, "idesk_session");
    if (session !== "admin") throw new HttpError(401, "未登录");
    c.set("actor", { kind: "human" });
  }
  await next();
});
export const requireHuman = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.get("actor").kind !== "human") throw new HttpError(403, "只有人可以创建智能体");
  await next();
});
export const requireAgent = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.get("actor").kind !== "agent") throw new HttpError(403, "只有智能体可以操作");
  await next();
});
