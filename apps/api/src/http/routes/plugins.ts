import type { OpenAPIHono } from "@hono/zod-openapi";
import { pluginSchema } from "@idesk/shared/plugin-schemas";
import { z } from "zod";
import { maskConfig, mergeSecrets } from "../../core/connectors/connectors.ts";
import {
  configurePlugin,
  disablePlugin,
  enablePlugin,
  listPlugins,
  plugins,
  reloadPlugin,
} from "../../plugins/registry.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, auth, requireHuman } from "../middleware/auth.ts";

function publicPlugins() {
  return listPlugins().map((plugin) => ({ ...plugin, config: maskConfig(plugin.config) }));
}

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
    (c) => c.json(publicPlugins(), 200),
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
        publicPlugins().find((plugin) => plugin.id === id) as z.infer<typeof pluginSchema>,
        200,
      );
    },
  );
  app.openapi(
    {
      method: "patch",
      path: "/api/v1/plugins/{id}",
      middleware: requireHuman,
      request: {
        params: z.object({ id: z.string() }),
        body: {
          content: {
            "application/json": { schema: z.object({ config: z.record(z.string(), z.unknown()) }) },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Plugin config",
          content: { "application/json": { schema: pluginSchema } },
        },
      },
    },
    async (c) => {
      const { id } = c.req.valid("param");
      const loaded = plugins.get(id);
      if (!loaded) throw new HttpError(404, "插件不存在");
      if (loaded.plugin.kind === "connector")
        throw new HttpError(400, "连接器的配置在连接器实例上");
      const previous = listPlugins().find((plugin) => plugin.id === id) as z.infer<
        typeof pluginSchema
      >;
      const merged = mergeSecrets(c.req.valid("json").config, previous.config);
      const parsed = loaded.plugin.configSchema.safeParse(merged);
      if (!parsed.success)
        throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join("；"));
      await configurePlugin(id, merged);
      return c.json(
        publicPlugins().find((plugin) => plugin.id === id) as z.infer<typeof pluginSchema>,
        200,
      );
    },
  );
  app.use("/api/plugins/*", auth);
  app.all("/api/plugins/:pluginId/*", async (c) => {
    const id = c.req.param("pluginId");
    const routes = plugins.get(id)?.routes;
    if (!routes) throw new HttpError(404, "插件不存在或已停用");
    const url = new URL(c.req.url);
    url.pathname = url.pathname.slice(`/api/plugins/${id}`.length);
    return routes.fetch(new Request(url, c.req.raw));
  });
}
