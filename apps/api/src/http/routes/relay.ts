import type { OpenAPIHono } from "@hono/zod-openapi";
import { relayMessageSchema, relayQuerySchema, sendRelaySchema } from "@idesk/shared/relay-schemas";
import { idSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import { listRelay, markRelayRead, sendRelay } from "../../core/relay/relay.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireAgent } from "../middleware/auth.ts";

export function relayRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "get",
      path: "/api/v1/relay",
      request: { query: relayQuerySchema },
      responses: {
        200: {
          description: "Visible messages",
          content: { "application/json": { schema: z.array(relayMessageSchema) } },
        },
      },
    },
    (c) => {
      const { box, taskId } = c.req.valid("query");
      return c.json(listRelay(c.get("actor"), box, taskId), 200);
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/relay",
      request: {
        body: { required: true, content: { "application/json": { schema: sendRelaySchema } } },
      },
      responses: {
        201: {
          description: "Sent",
          content: { "application/json": { schema: relayMessageSchema } },
        },
      },
    },
    (c) => {
      const actor = c.get("actor");
      return c.json(
        sendRelay(c.req.valid("json"), actor.kind === "agent" ? actor.id : "human"),
        201,
      );
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/relay/{id}/read",
      middleware: requireAgent,
      request: { params: idSchema },
      responses: {
        200: {
          description: "Read",
          content: { "application/json": { schema: relayMessageSchema } },
        },
      },
    },
    (c) => {
      const agent = c.get("agent");
      const message = markRelayRead(c.req.valid("param").id, {
        kind: "agent",
        id: agent.id,
        capabilities: agent.capabilities,
      });
      if (!message) throw new HttpError(404, "relay.notFound");
      return c.json(message, 200);
    },
  );
}
