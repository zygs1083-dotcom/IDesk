import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { and, desc, eq, gt, type SQL } from "drizzle-orm";
import { getDb, schema } from "../db/index.js";
import type { AppEnv } from "../auth/actor.js";
import { requireActor } from "../auth/middleware.js";
import { onEvent } from "./bus.js";

export const eventRoutes = new Hono<AppEnv>()
  .use(requireActor)
  .get("/", (c) => {
    const after = Number(c.req.query("after") ?? 0);
    const type = c.req.query("type");
    const taskId = c.req.query("taskId");
    const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
    const where: SQL[] = [];
    if (after > 0) where.push(gt(schema.events.id, after));
    if (type) where.push(eq(schema.events.type, type));
    if (taskId) where.push(eq(schema.events.taskId, taskId));
    const rows = getDb()
      .select()
      .from(schema.events)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(schema.events.id))
      .limit(limit)
      .all();
    return c.json({ events: rows });
  })
  .get("/stream", (c) =>
    streamSSE(c, async (stream) => {
      let id = 0;
      const off = onEvent((e) => {
        void stream.writeSSE({ id: String(e.id), event: e.type, data: JSON.stringify(e) });
      });
      stream.onAbort(() => off());
      await stream.writeSSE({ event: "ready", data: JSON.stringify({ ts: Date.now() }) });
      while (!stream.aborted) {
        await stream.sleep(25_000);
        await stream.writeSSE({ event: "ping", data: String(++id) });
      }
    }),
  );
