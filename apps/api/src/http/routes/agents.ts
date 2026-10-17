import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  agentStatsSchema,
  patchAgentSchema,
  publicAgentSchema,
  registerAgentSchema,
  registeredAgentSchema,
} from "@idesk/shared/agent-schemas";
import { idSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import {
  deleteAgent,
  listAgents,
  registerAgent,
  rotateAgentKey,
  updateAgent,
} from "../../core/agents/agents.ts";
import { getAgentStats } from "../../core/agents/stats.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireAgent, requireHuman } from "../middleware/auth.ts";

export function agentRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "post",
      path: "/api/v1/agents/{id}/rotate-key",
      middleware: requireHuman,
      request: { params: idSchema },
      responses: {
        200: {
          description: "Rotated; key returned once",
          content: { "application/json": { schema: registeredAgentSchema } },
        },
      },
    },
    (c) => {
      const result = rotateAgentKey(c.req.valid("param").id);
      if (!result) throw new HttpError(404, "agent.notFound");
      c.header("Cache-Control", "no-store");
      return c.json(result, 200);
    },
  );
  app.openapi(
    {
      method: "patch",
      path: "/api/v1/agents/{id}",
      middleware: requireHuman,
      request: {
        params: idSchema,
        body: { required: true, content: { "application/json": { schema: patchAgentSchema } } },
      },
      responses: {
        200: {
          description: "Updated agent",
          content: { "application/json": { schema: publicAgentSchema } },
        },
      },
    },
    (c) => {
      const agent = updateAgent(c.req.valid("param").id, c.req.valid("json"));
      if (!agent) throw new HttpError(404, "agent.notFound");
      return c.json(agent, 200);
    },
  );
  app.openapi(
    {
      method: "delete",
      path: "/api/v1/agents/{id}",
      middleware: requireHuman,
      request: { params: idSchema },
      responses: { 204: { description: "Deleted agent" } },
    },
    (c) => {
      if (!deleteAgent(c.req.valid("param").id)) throw new HttpError(404, "agent.notFound");
      return c.body(null, 204);
    },
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/agents/{id}/stats",
      request: { params: idSchema },
      responses: {
        200: {
          description: "Agent stats",
          content: { "application/json": { schema: agentStatsSchema } },
        },
      },
    },
    (c) => {
      const stats = getAgentStats(c.req.valid("param").id);
      if (!stats) throw new HttpError(404, "agent.notFound");
      return c.json(stats, 200);
    },
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/agents",
      responses: {
        200: {
          description: "Agents",
          content: { "application/json": { schema: z.array(publicAgentSchema) } },
        },
      },
    },
    (c) => c.json(listAgents(), 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/agents",
      middleware: requireHuman,
      request: {
        body: { required: true, content: { "application/json": { schema: registerAgentSchema } } },
      },
      responses: {
        201: {
          description: "Registered; key returned once",
          content: { "application/json": { schema: registeredAgentSchema } },
        },
      },
    },
    (c) => c.json(registerAgent(c.req.valid("json")), 201),
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/agents/me",
      middleware: requireAgent,
      responses: {
        200: {
          description: "Current agent",
          content: { "application/json": { schema: publicAgentSchema } },
        },
      },
    },
    (c) => c.json(c.get("agent"), 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/agents/me/heartbeat",
      middleware: requireAgent,
      responses: {
        200: {
          description: "Presence refreshed",
          content: { "application/json": { schema: publicAgentSchema } },
        },
      },
    },
    (c) => c.json(c.get("agent"), 200),
  );
}
