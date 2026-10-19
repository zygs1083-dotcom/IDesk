import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  patchMeSchema,
  publicAgentSchema,
  webhookTestResultSchema,
} from "@idesk/shared/agent-schemas";
import { idSchema } from "@idesk/shared/task-schemas";
import { updateAgent } from "../../core/agents/agents.ts";
import { testAgentWebhook } from "../../core/agents/webhook-test.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireAgent, requireHuman } from "../middleware/auth.ts";

export function agentWebhookRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "patch",
      path: "/api/v1/agents/me",
      middleware: requireAgent,
      request: {
        body: { required: true, content: { "application/json": { schema: patchMeSchema } } },
      },
      responses: {
        200: {
          description: "Updated current agent",
          content: { "application/json": { schema: publicAgentSchema } },
        },
      },
    },
    (c) => c.json(updateAgent(c.get("agent").id, c.req.valid("json")), 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/agents/me/webhook-test",
      middleware: requireAgent,
      responses: {
        200: {
          description: "Webhook test result",
          content: { "application/json": { schema: webhookTestResultSchema } },
        },
      },
    },
    async (c) => {
      const result = await testAgentWebhook(c.get("agent").id);
      if (!result) throw new HttpError(404, "agent.notFound");
      return c.json(result, 200);
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/agents/{id}/webhook-test",
      middleware: requireHuman,
      request: { params: idSchema },
      responses: {
        200: {
          description: "Webhook test result",
          content: { "application/json": { schema: webhookTestResultSchema } },
        },
      },
    },
    async (c) => {
      const result = await testAgentWebhook(c.req.valid("param").id);
      if (!result) throw new HttpError(404, "agent.notFound");
      return c.json(result, 200);
    },
  );
}
