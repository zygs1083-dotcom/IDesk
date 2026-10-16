import { createRoute, type OpenAPIHono, type RouteConfig } from "@hono/zod-openapi";
import {
  createScheduleSchema,
  scheduleSchema,
  updateScheduleSchema,
} from "@idesk/shared/schedule-schemas";
import { idSchema } from "@idesk/shared/task-schemas";
import { Cron } from "croner";
import { validator } from "hono/validator";
import { z } from "zod";
import { runSchedule } from "../../core/schedules/run.ts";
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  listSchedules,
  updateSchedule,
} from "../../core/schedules/schedules.ts";
import { syncSchedule, unscheduleSchedule } from "../../scheduler/schedules.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireHuman } from "../middleware/auth.ts";

function validCron(row: { cron: string; timezone: string }): boolean {
  try {
    new Cron(row.cron, { timezone: row.timezone, paused: true }).nextRun();
    return true;
  } catch {
    return false;
  }
}

export function scheduleRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "get",
      path: "/api/v1/schedules",
      responses: {
        200: {
          description: "Schedules",
          content: { "application/json": { schema: z.array(scheduleSchema) } },
        },
      },
    },
    (c) => c.json(listSchedules(), 200),
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/schedules/{id}",
      request: { params: idSchema },
      responses: {
        200: {
          description: "Schedule",
          content: { "application/json": { schema: scheduleSchema } },
        },
      },
    },
    (c) => {
      const row = getSchedule(c.req.valid("param").id);
      if (!row) throw new HttpError(404, "schedule.notFound");
      return c.json(row, 200);
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/schedules",
      middleware: requireHuman,
      request: {
        body: {
          required: true,
          content: {
            "application/json": {
              schema: createScheduleSchema.refine(validCron, "cron 表达式无效"),
            },
          },
        },
      },
      responses: {
        201: {
          description: "Created",
          content: { "application/json": { schema: scheduleSchema } },
        },
      },
    },
    (c) => {
      const row = createSchedule(c.req.valid("json"));
      syncSchedule(row);
      return c.json(row, 201);
    },
  );
  const patchRoute = createRoute({
    method: "patch",
    path: "/api/v1/schedules/{id}",
    request: { params: idSchema },
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: z.toJSONSchema(updateScheduleSchema, { io: "input" }),
        },
      },
    } as NonNullable<RouteConfig["requestBody"]>,
    middleware: [
      requireHuman,
      validator("json", (body, c) => {
        const row = getSchedule(c.req.param("id") as string);
        if (!row) throw new HttpError(404, "schedule.notFound");
        const parsed = updateScheduleSchema
          .refine((input) => validCron({ ...row, ...input }), "cron 表达式无效")
          .safeParse(body);
        if (!parsed.success)
          throw new HttpError(400, "validation", {
            text: parsed.error.issues.map((issue) => issue.message).join("；"),
          });
        return parsed.data;
      }),
    ],
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: scheduleSchema } } },
    },
  });
  app.openapi<
    typeof patchRoute,
    {
      out: {
        json: z.output<typeof updateScheduleSchema>;
        param: z.output<typeof idSchema>;
      };
    }
  >(patchRoute, (c) => {
    const row = updateSchedule(c.req.valid("param").id, c.req.valid("json"));
    if (!row) throw new HttpError(404, "schedule.notFound");
    syncSchedule(row);
    return c.json(row, 200);
  });
  app.openapi(
    {
      method: "delete",
      path: "/api/v1/schedules/{id}",
      middleware: requireHuman,
      request: { params: idSchema },
      responses: { 204: { description: "Deleted" } },
    },
    (c) => {
      const id = c.req.valid("param").id;
      if (!deleteSchedule(id)) throw new HttpError(404, "schedule.notFound");
      unscheduleSchedule(id);
      return c.body(null, 204);
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/schedules/{id}/run",
      middleware: requireHuman,
      request: { params: idSchema },
      responses: {
        200: {
          description: "Executed",
          content: { "application/json": { schema: scheduleSchema } },
        },
      },
    },
    async (c) => {
      const row = await runSchedule(c.req.valid("param").id);
      if (!row) throw new HttpError(404, "schedule.notFound");
      return c.json(row, 200);
    },
  );
}
