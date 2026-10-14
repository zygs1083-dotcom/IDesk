import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { TASK_ACTIONS, progressSchema, publishTaskSchema, taskStatusSchema, updateTaskSchema } from "@idesk/core";
import type { AppEnv } from "../auth/actor.js";
import { getActor, requireActor } from "../auth/middleware.js";
import { actOnTask, deleteTask, getTask, listTasks, publishTask, renewLease, reportProgress, updateTask } from "./service.js";
import { listRelay } from "../relay/service.js";
import { getDb, schema } from "../db/index.js";
import { desc, eq } from "drizzle-orm";

const listQuery = z.object({
  status: z.string().optional(),
  capability: z.string().optional(),
  fit: z.string().optional(),
  q: z.string().optional(),
  agentId: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const taskRoutes = new Hono<AppEnv>()
  .use(requireActor)
  .get("/", zValidator("query", listQuery), (c) => {
    const q = c.req.valid("query");
    const status = q.status ? q.status.split(",").map((s) => taskStatusSchema.parse(s.trim())) : undefined;
    return c.json({
      tasks: listTasks(getActor(c), { status, capability: q.capability, fit: q.fit === "me" || q.fit === "1", q: q.q, agentId: q.agentId, limit: q.limit }),
    });
  })
  .post("/", zValidator("json", publishTaskSchema), (c) => c.json(publishTask(getActor(c), c.req.valid("json")), 201))
  .get("/:id", (c) => {
    const actor = getActor(c);
    const id = c.req.param("id");
    const task = getTask(actor, id);
    const events = getDb().select().from(schema.events).where(eq(schema.events.taskId, id)).orderBy(desc(schema.events.id)).limit(200).all();
    const relay = listRelay(actor, { box: `task:${id}`, limit: 100 });
    return c.json({ ...task, events, relay });
  })
  .patch("/:id", zValidator("json", updateTaskSchema), (c) => c.json(updateTask(getActor(c), c.req.param("id"), c.req.valid("json"))))
  .delete("/:id", (c) => {
    deleteTask(getActor(c), c.req.param("id"));
    return c.json({ ok: true });
  })
  .post("/:id/progress", zValidator("json", progressSchema), (c) => {
    const { message, percent } = c.req.valid("json");
    return c.json(reportProgress(getActor(c), c.req.param("id"), message, percent));
  })
  .post("/:id/heartbeat", (c) => c.json(renewLease(getActor(c), c.req.param("id"))))
  .post("/:id/:action", async (c) => {
    const action = c.req.param("action") as (typeof TASK_ACTIONS)[number];
    if (!TASK_ACTIONS.includes(action)) return c.json({ error: `Unknown action "${action}"` }, 404);
    const body = c.req.header("content-length") && c.req.header("content-length") !== "0" ? await c.req.json().catch(() => ({})) : {};
    return c.json(actOnTask(getActor(c), c.req.param("id"), action, body));
  });
