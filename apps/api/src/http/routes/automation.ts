import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  automationJobSchema,
  automationQuerySchema,
  automationRunSchema,
  automationRunWithJobSchema,
} from "@idesk/shared/automation-schemas";
import { idSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import { listJobs, listRuns, listRunsForConnector } from "../../core/automation/automation.ts";
import { HttpError } from "../errors.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export function automationRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "get",
      path: "/api/v1/automation/runs",
      request: { query: z.object({ connectorId: z.string().min(1) }) },
      responses: {
        200: {
          description: "Connector runs with workflow names",
          content: { "application/json": { schema: z.array(automationRunWithJobSchema) } },
        },
      },
    },
    (c) => c.json(listRunsForConnector(c.req.valid("query").connectorId), 200),
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/automation/jobs",
      request: { query: automationQuerySchema },
      responses: {
        200: {
          description: "Jobs",
          content: { "application/json": { schema: z.array(automationJobSchema) } },
        },
      },
    },
    (c) => c.json(listJobs(c.req.valid("query").connectorId), 200),
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/automation/jobs/{id}/runs",
      request: { params: idSchema },
      responses: {
        200: {
          description: "Runs",
          content: { "application/json": { schema: z.array(automationRunSchema) } },
        },
      },
    },
    (c) => {
      const runs = listRuns(c.req.valid("param").id);
      if (!runs) throw new HttpError(404, "automation.notFound");
      return c.json(runs, 200);
    },
  );
}
