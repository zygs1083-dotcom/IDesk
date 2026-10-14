import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { sendRelaySchema } from "@idesk/core";
import type { AppEnv } from "../auth/actor.js";
import { getActor, requireActor } from "../auth/middleware.js";
import { getRelay, listRelay, markRead, sendRelay, unreadCount, type RelayBox } from "./service.js";

export const relayRoutes = new Hono<AppEnv>()
  .use(requireActor)
  .get("/", (c) => {
    const actor = getActor(c);
    const before = c.req.query("before");
    return c.json({
      messages: listRelay(actor, {
        box: (c.req.query("box") as RelayBox | undefined) ?? "inbox",
        unread: c.req.query("unread") === "1" || c.req.query("unread") === "true",
        limit: Number(c.req.query("limit") ?? 100),
        before: before ? new Date(before) : undefined,
      }),
      unread: unreadCount(actor),
    });
  })
  .post("/", zValidator("json", sendRelaySchema), (c) => c.json(sendRelay(getActor(c), c.req.valid("json")), 201))
  .get("/:id", (c) => c.json(getRelay(getActor(c), c.req.param("id"))))
  .post("/:id/read", (c) => c.json(markRead(getActor(c), c.req.param("id"))));
