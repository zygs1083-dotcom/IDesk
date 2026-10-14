import { timingSafeEqual } from "node:crypto";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { loginSchema } from "@idesk/shared/agent-schemas";
import { errorSchema } from "@idesk/shared/task-schemas";
import { setSignedCookie } from "hono/cookie";
import { z } from "zod";
import { config } from "../../config.ts";
import { HttpError } from "../errors.ts";
import type { AuthEnv } from "../middleware/auth.ts";

export function authRoutes(app: OpenAPIHono<AuthEnv>) {
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
      const expected = Buffer.from(config.IDESK_ADMIN_PASSWORD);
      if (password.length !== expected.length || !timingSafeEqual(password, expected)) {
        throw new HttpError(401, "密码不对");
      }
      await setSignedCookie(c, "idesk_session", "admin", config.IDESK_SESSION_SECRET, {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
      return c.json({ ok: true }, 200);
    },
  );
}
