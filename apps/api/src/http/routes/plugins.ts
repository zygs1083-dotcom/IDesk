import type { OpenAPIHono } from "@hono/zod-openapi";
import { pluginSchema } from "@idesk/shared/plugin-schemas";
import { getSignedCookie } from "hono/cookie";
import { z } from "zod";
import { config } from "../../config.ts";
import {
  disablePlugin,
  enablePlugin,
  listPlugins,
  plugins,
  reloadPlugin,
} from "../../plugins/registry.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireHuman } from "../middleware/auth.ts";

const actions = { enable: enablePlugin, disable: disablePlugin, reload: reloadPlugin };

export function pluginRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "get",
      path: "/api/v1/plugins",
      responses: {
        200: {
          description: "Plugins",
          content: { "application/json": { schema: z.array(pluginSchema) } },
        },
      },
    },
    (c) => c.json(listPlugins(), 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/plugins/{id}/{action}",
      middleware: requireHuman,
      request: {
        params: z.object({ id: z.string(), action: z.enum(["enable", "disable", "reload"]) }),
      },
      responses: {
        200: {
          description: "Plugin state",
          content: { "application/json": { schema: pluginSchema } },
        },
      },
    },
    async (c) => {
      const { id, action } = c.req.valid("param");
      if (!plugins.has(id)) throw new HttpError(404, "插件不存在");
      await actions[action](id);
      return c.json(
        listPlugins().find((plugin) => plugin.id === id) as z.infer<typeof pluginSchema>,
        200,
      );
    },
  );
  app.all("/api/plugins/:pluginId/*", async (c) => {
    const session = await getSignedCookie(c, config.IDESK_SESSION_SECRET, "idesk_session");
    if (session !== "admin") throw new HttpError(401, "未登录");
    const id = c.req.param("pluginId");
    const routes = plugins.get(id)?.routes;
    if (!routes) throw new HttpError(404, "插件不存在或已停用");
    const url = new URL(c.req.url);
    url.pathname = url.pathname.slice(`/api/plugins/${id}`.length);
    return routes.fetch(new Request(url, c.req.raw));
  });
}
