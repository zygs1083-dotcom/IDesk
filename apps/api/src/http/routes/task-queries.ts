import type { OpenAPIHono } from "@hono/zod-openapi";
import { eventSchema, idSchema, taskQuerySchema, taskSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import { listEvents } from "../../core/events/query.ts";
import { getTask, listTasks } from "../../core/tasks/store.ts";
import { HttpError } from "../errors.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export function taskQueryRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      description:
        "Without limit, returns the legacy task array. With limit (1–100), status is required and returns {items, nextCursor}; pass nextCursor as cursor for the next page ordered by updatedAt and id descending. Explicit status includes all history; default listing retains only seven days of terminal tasks.",
      method: "get",
      path: "/api/v1/tasks",
      request: { query: taskQuerySchema },
      responses: {
        200: {
          description: "Tasks",
          content: {
            "application/json": {
              schema: z.union([
                z.array(taskSchema),
                z.object({
                  items: z.array(taskSchema),
                  nextCursor: z.string().nullable(),
                }),
              ]),
            },
          },
        },
      },
    },
    (c) => {
      const { assignee, ...filter } = c.req.valid("query");
      const items = listTasks({
        ...filter,
        ...(filter.limit === undefined ? {} : { limit: filter.limit + 1 }),
        ...(assignee === undefined ? {} : { assigneeId: assignee }),
      });
      if (filter.limit === undefined) return c.json(items, 200);
      const hasMore = items.length > filter.limit;
      const page = items.slice(0, filter.limit);
      const last = page.at(-1);
      return c.json(
        {
          items: page,
          nextCursor: hasMore && last ? `${last.updatedAt.getTime()}|${last.id}` : null,
        },
        200,
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
      if (!task) throw new HttpError(404, "task.notFound");
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
      if (!getTask(id)) throw new HttpError(404, "task.notFound");
      return c.json(listEvents({ taskId: id }), 200);
    },
  );
}
