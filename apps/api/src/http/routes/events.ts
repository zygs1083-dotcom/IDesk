import type { OpenAPIHono } from "@hono/zod-openapi";
import { eventQuerySchema, eventSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import { listEvents } from "../../core/events/query.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export function eventRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "get",
      path: "/api/v1/events",
      request: { query: eventQuerySchema },
      responses: {
        200: {
          description: "Latest events (up to 200)",
          content: { "application/json": { schema: z.array(eventSchema) } },
        },
      },
    },
    (c) => c.json(listEvents(c.req.valid("query")), 200),
  );
}
