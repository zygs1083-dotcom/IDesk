import { timingSafeEqual } from "node:crypto";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { authMeSchema, loginSchema } from "@idesk/shared/agent-schemas";
import { errorSchema } from "@idesk/shared/task-schemas";
import { setSignedCookie } from "hono/cookie";
import { z } from "zod";
import { config } from "../../config.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireHuman } from "../middleware/auth.ts";

function matchesPassword(password: Buffer, expected: string) {
  const value = Buffer.from(expected);
  return password.length === value.length && timingSafeEqual(password, value);
}

export function authRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "get",
      path: "/api/v1/auth/me",
      middleware: requireHuman,
      responses: {
        200: {
          description: "Current session role",
          content: { "application/json": { schema: authMeSchema } },
        },
      },
    },
    (c) => c.json({ role: c.get("readonly") ? "viewer" : "admin" }, 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/auth/login",
      request: {
        body: { required: true, content: { "application/json": { schema: loginSchema } } },
      },
      responses: {
        200: {
          description: "Logged in",
          content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
        },
        401: {
          description: "Incorrect password",
          content: { "application/json": { schema: errorSchema } },
        },
      },
    },
    async (c) => {
      const password = Buffer.from(c.req.valid("json").password);
      let role: "admin" | "viewer";
      if (matchesPassword(password, config.IDESK_ADMIN_PASSWORD)) role = "admin";
      else if (
        config.IDESK_VIEWER_PASSWORD &&
        matchesPassword(password, config.IDESK_VIEWER_PASSWORD)
      )
        role = "viewer";
      else throw new HttpError(401, "密码不对");
      await setSignedCookie(c, "idesk_session", role, config.IDESK_SESSION_SECRET, {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
      return c.json({ ok: true }, 200);
    },
  );
}
