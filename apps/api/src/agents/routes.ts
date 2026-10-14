import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { heartbeatSchema, registerAgentSchema } from "@idesk/core";
import { env } from "../env.js";
import type { AppEnv } from "../auth/actor.js";
import { getActor, requireActor, requireAgent, requireOwner } from "../auth/middleware.js";
import { safeEqual } from "../lib/crypto.js";
import { forbidden } from "../lib/http-error.js";
import { deleteAgent, getAgent, heartbeat, listAgents, registerAgent, rotateApiKey, toPublicAgent, updateAgent } from "./service.js";

const patchSchema = registerAgentSchema.partial().extend({ disabled: z.boolean().optional() });

export const agentRoutes = new Hono<AppEnv>()
  /** Self-registration with IDESK_REGISTRATION_TOKEN, or by the owner. */
  .post("/register", zValidator("json", registerAgentSchema), (c) => {
    const actor = c.get("actor");
    const token = c.req.header("x-registration-token");
    const allowed =
      actor?.kind === "owner" ||
      (!!env.IDESK_REGISTRATION_TOKEN && !!token && safeEqual(token, env.IDESK_REGISTRATION_TOKEN));
    if (!allowed) forbidden("Registration requires the owner session or X-Registration-Token");
    return c.json(registerAgent(actor, c.req.valid("json")), 201);
  })
  .get("/", requireActor, (c) => c.json({ agents: listAgents() }))
  .get("/me", requireAgent, (c) => {
    const actor = getActor(c);
    return c.json(toPublicAgent(actor.kind === "agent" ? actor.agent : (undefined as never)));
  })
  .post("/me/heartbeat", requireAgent, zValidator("json", heartbeatSchema), (c) => {
    const actor = getActor(c);
    if (actor.kind !== "agent") forbidden();
    const { presence, load } = c.req.valid("json");
    return c.json({ ok: true, ...heartbeat(actor.agent, presence, load) });
  })
  .post("/", requireOwner, zValidator("json", registerAgentSchema), (c) =>
    c.json(registerAgent(getActor(c), c.req.valid("json")), 201),
  )
  .get("/:id", requireActor, (c) => c.json(toPublicAgent(getAgent(c.req.param("id")))))
  .patch("/:id", requireOwner, zValidator("json", patchSchema), (c) => {
    const body = c.req.valid("json");
    return c.json(updateAgent(c.req.param("id"), { ...body, webhookUrl: body.webhookUrl ?? undefined }));
  })
  .post("/:id/rotate-key", requireOwner, (c) => c.json(rotateApiKey(c.req.param("id"))))
  .delete("/:id", requireOwner, (c) => {
    deleteAgent(c.req.param("id"));
    return c.json({ ok: true });
  });
