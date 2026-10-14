import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  publicAgentSchema,
  registerAgentSchema,
  registeredAgentSchema,
} from "@idesk/shared/agent-schemas";
import { z } from "zod";
import { listAgents, registerAgent } from "../../core/agents/agents.ts";
import { type AuthEnv, requireAgent, requireHuman } from "../middleware/auth.ts";

export function agentRoutes(app: OpenAPIHono<AuthEnv>) {
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
