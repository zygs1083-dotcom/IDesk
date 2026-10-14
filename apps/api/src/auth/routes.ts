import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { env, isProd } from "../env.js";
import { makeSessionToken, safeEqual } from "../lib/crypto.js";
import { unauthorized } from "../lib/http-error.js";
import { SESSION_COOKIE } from "./middleware.js";
import type { AppEnv } from "./actor.js";
import { toPublicAgent } from "../agents/service.js";

export const authRoutes = new Hono<AppEnv>()
  .post("/login", zValidator("json", z.object({ password: z.string() })), (c) => {
    const { password } = c.req.valid("json");
    if (!safeEqual(password, env.IDESK_ADMIN_PASSWORD)) unauthorized("Wrong password");
    setCookie(c, SESSION_COOKIE, makeSessionToken(), {
      httpOnly: true,
      sameSite: "Lax",
      secure: isProd,
      path: "/",
      maxAge: 30 * 24 * 3600,
    });
    return c.json({ ok: true });
  })
  .post("/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", (c) => {
    const actor = c.get("actor");
    if (!actor) return c.json({ kind: null });
    if (actor.kind === "owner") return c.json({ kind: "owner" });
    return c.json({ kind: "agent", agent: toPublicAgent(actor.agent) });
  });
