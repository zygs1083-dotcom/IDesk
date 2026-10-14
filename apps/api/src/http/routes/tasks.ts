import { createRoute, type OpenAPIHono, type RouteConfig } from "@hono/zod-openapi";
import { TransitionError } from "@idesk/shared/task-machine";
import {
  createTaskSchema,
  errorSchema,
  eventSchema,
  idSchema,
  reportSchema,
  taskActionSchema,
  taskDependenciesSchema,
  taskQuerySchema,
  taskSchema,
} from "@idesk/shared/task-schemas";
import { validator } from "hono/validator";
import { z } from "zod";
import { listEvents } from "../../core/events/query.ts";
import { updateDependencies } from "../../core/tasks/dependencies.ts";
import { createTask, getTask, listTasks } from "../../core/tasks/store.ts";
import { actOnTask, reportProgress } from "../../core/tasks/transition.ts";
import { HttpError } from "../errors.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export function taskRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "get",
      path: "/api/v1/tasks",
      request: { query: taskQuerySchema },
      responses: {
        200: {
          description: "Tasks",
          content: { "application/json": { schema: z.array(taskSchema) } },
        },
      },
    },
    (c) => {
      const { assignee, ...filter } = c.req.valid("query");
      return c.json(
        listTasks({ ...filter, ...(assignee === undefined ? {} : { assigneeId: assignee }) }),
        200,
      );
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/tasks",
      request: {
        body: { required: true, content: { "application/json": { schema: createTaskSchema } } },
      },
      responses: {
        201: { description: "Published", content: { "application/json": { schema: taskSchema } } },
      },
    },
    (c) => {
      const { dueAt, ...input } = c.req.valid("json");
      const actor = c.get("actor");
      return c.json(
        createTask(
          { ...input, ...(dueAt === undefined ? {} : { dueAt: new Date(dueAt) }) },
          actor.kind === "agent" ? actor.id : "human",
        ),
        201,
      );
    },
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/tasks/{id}",
      request: { params: idSchema },
      responses: {
        200: { description: "Task", content: { "application/json": { schema: taskSchema } } },
      },
    },
    (c) => {
      const task = getTask(c.req.valid("param").id);
      if (!task) throw new HttpError(404, "任务不存在");
      return c.json(task, 200);
    },
  );
  app.openapi(
    {
      method: "patch",
      path: "/api/v1/tasks/{id}",
      request: {
        params: idSchema,
        body: {
          required: true,
          content: { "application/json": { schema: taskDependenciesSchema } },
        },
      },
      responses: {
        200: { description: "Updated", content: { "application/json": { schema: taskSchema } } },
      },
    },
    (c) =>
      c.json(
        updateDependencies(c.req.valid("param").id, c.req.valid("json").blockedBy, c.get("actor")),
        200,
      ),
  );
  const actionRoute = createRoute({
    method: "post",
    path: "/api/v1/tasks/{id}/actions/{action}",
    request: {
      params: z.object({
        id: z.string(),
        action: z.enum(taskActionSchema.options.map((option) => option.shape.type.value)),
      }),
    },
    description:
      "assign: {agentId}; recruit: {needed}; complete: {result}; handoff: {to?, note}; other actions: {} or no body.",
    requestBody: {
      content: {
        "application/json": {
          schema: z.toJSONSchema(taskActionSchema),
        },
      },
    } as NonNullable<RouteConfig["requestBody"]>,
    middleware: validator("json", (body, c) => {
      const parsed = taskActionSchema.safeParse({ ...body, type: c.req.param("action") });
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join("；"));
      }
      return parsed.data;
    }),
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: taskSchema } } },
      409: {
        description: "Transition rejected",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  });
  app.openapi<
    typeof actionRoute,
    {
      out: {
        json: z.output<typeof taskActionSchema>;
        param: z.output<typeof actionRoute.request.params>;
      };
    }
  >(actionRoute, (c) => {
    const task = actOnTask(c.req.valid("param").id, c.req.valid("json"), c.get("actor"));
    if (!task) throw new HttpError(404, "任务不存在");
    if (task instanceof TransitionError) return c.json({ error: task.message }, 409);
    return c.json(task, 200);
  });
  app.openapi(
    {
      method: "post",
      path: "/api/v1/tasks/{id}/report",
      request: {
        params: idSchema,
        body: { required: true, content: { "application/json": { schema: reportSchema } } },
      },
      responses: {
        200: { description: "Reported", content: { "application/json": { schema: taskSchema } } },
        409: {
          description: "Report rejected",
          content: { "application/json": { schema: errorSchema } },
        },
      },
    },
    (c) => {
      const task = reportProgress(
        c.req.valid("param").id,
        c.get("actor"),
        c.req.valid("json").message,
      );
      if (!task) throw new HttpError(404, "任务不存在");
      if (task instanceof TransitionError) return c.json({ error: task.message }, 409);
      return c.json(task, 200);
    },
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/tasks/{id}/events",
      request: { params: idSchema },
      responses: {
        200: {
          description: "Task events",
          content: { "application/json": { schema: z.array(eventSchema) } },
        },
      },
    },
    (c) => {
      const { id } = c.req.valid("param");
      if (!getTask(id)) throw new HttpError(404, "任务不存在");
      return c.json(listEvents({ taskId: id }), 200);
    },
  );
}
