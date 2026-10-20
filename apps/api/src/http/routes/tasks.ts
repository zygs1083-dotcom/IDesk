import { createRoute, type OpenAPIHono, type RouteConfig } from "@hono/zod-openapi";
import { TransitionError } from "@idesk/shared/task-machine";
import {
  errorSchema,
  idSchema,
  reportSchema,
  taskActionSchema,
  taskSchema,
  updateTaskSchema,
  webPublishTaskSchema,
} from "@idesk/shared/task-schemas";
import { validator } from "hono/validator";
import { z } from "zod";
import { getPerson } from "../../core/people/people.ts";
import { updateTask } from "../../core/tasks/edit.ts";
import { publishTask } from "../../core/tasks/publish.ts";
import { actOnTask, reportProgress } from "../../core/tasks/transition.ts";
import { HttpError } from "../errors.ts";
import type { AuthEnv } from "../middleware/auth.ts";
import { requestLang } from "../request-lang.ts";
import { taskQueryRoutes } from "./task-queries.ts";

export function taskRoutes(app: OpenAPIHono<AuthEnv>) {
  taskQueryRoutes(app);
  app.openapi(
    {
      method: "post",
      path: "/api/v1/tasks",
      request: {
        body: { required: true, content: { "application/json": { schema: webPublishTaskSchema } } },
      },
      responses: {
        201: { description: "Published", content: { "application/json": { schema: taskSchema } } },
        409: {
          description: "Transition rejected",
          content: { "application/json": { schema: errorSchema } },
        },
      },
    },
    (c) => {
      const { dueAt, dispatch, publisherPersonId, ...input } = c.req.valid("json");
      const actor = c.get("actor");
      if (publisherPersonId !== undefined) {
        if (actor.kind !== "human") throw new HttpError(403, "auth.humanOnly");
        if (!getPerson(publisherPersonId)) throw new HttpError(400, "person.notFound");
      }
      const task = publishTask(
        { ...input, ...(dueAt === undefined ? {} : { dueAt: new Date(dueAt) }) },
        actor,
        dispatch,
        publisherPersonId === undefined ? undefined : { personId: publisherPersonId, via: "web" },
      );
      if (task instanceof TransitionError)
        return c.json({ error: task.translate(requestLang(c.req.header("Accept-Language"))) }, 409);
      return c.json(task, 201);
    },
  );
  app.openapi(
    {
      description:
        "Edit task details as a human or original publisher in any state. Supply at least one field; dueAt: null clears the deadline. Assignment, lease, status and result are unchanged.",
      method: "patch",
      path: "/api/v1/tasks/{id}",
      request: {
        params: idSchema,
        body: {
          required: true,
          content: { "application/json": { schema: updateTaskSchema } },
        },
      },
      responses: {
        200: { description: "Updated", content: { "application/json": { schema: taskSchema } } },
      },
    },
    (c) => c.json(updateTask(c.req.valid("param").id, c.req.valid("json"), c.get("actor")), 200),
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
        throw new HttpError(400, "validation", {
          text: parsed.error.issues.map((issue) => issue.message).join("；"),
        });
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
    if (!task) throw new HttpError(404, "task.notFound");
    if (task instanceof TransitionError)
      return c.json({ error: task.translate(requestLang(c.req.header("Accept-Language"))) }, 409);
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
      if (!task) throw new HttpError(404, "task.notFound");
      if (task instanceof TransitionError)
        return c.json({ error: task.translate(requestLang(c.req.header("Accept-Language"))) }, 409);
      return c.json(task, 200);
    },
  );
}
