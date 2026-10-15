import type { OpenAPIHono } from "@hono/zod-openapi";
import type { Lang } from "@idesk/shared/labels";
import { pluginSchema } from "@idesk/shared/plugin-schemas";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { maskConfig, mergeSecrets } from "../../core/connectors/connectors.ts";
import { db } from "../../db/client.ts";
import { pluginState } from "../../db/schema.ts";
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
import { pluginTitles } from "../plugin-titles.ts";
import { requestLang } from "../request-lang.ts";

function publicPlugins(lang: Lang): z.infer<typeof pluginSchema>[] {
  return listPlugins().map((plugin) => ({
    ...plugin,
    config: maskConfig(plugin.config),
    configSchema: pluginTitles(plugin.configSchema, lang),
  }));
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
    (c) => c.json(publicPlugins(requestLang(c.req.header("Accept-Language"))), 200),
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
      if (!plugins.has(id)) throw new HttpError(404, "plugin.notFound");
      await actions[action](id);
      return c.json(
        publicPlugins(requestLang(c.req.header("Accept-Language"))).find(
          (plugin) => plugin.id === id,
        ) as z.infer<typeof pluginSchema>,
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
      if (!loaded) throw new HttpError(404, "plugin.notFound");
      if (loaded.plugin.kind === "connector")
        throw new HttpError(400, "connector.configOnInstance");
      const previous = db
        .select({ config: pluginState.config })
        .from(pluginState)
        .where(eq(pluginState.pluginId, id))
        .get();
      const merged = mergeSecrets(c.req.valid("json").config, previous?.config ?? {});
      const parsed = loaded.plugin.configSchema.safeParse(merged);
      if (!parsed.success)
        throw new HttpError(400, "validation", {
          text: parsed.error.issues.map((issue) => issue.message).join("；"),
        });
      await configurePlugin(id, merged);
      return c.json(
        publicPlugins(requestLang(c.req.header("Accept-Language"))).find(
          (plugin) => plugin.id === id,
        ) as z.infer<typeof pluginSchema>,
        200,
      );
    },
  );
  app.use("/api/plugins/*", auth);
  app.all("/api/plugins/:pluginId/*", async (c) => {
    const id = c.req.param("pluginId");
    const routes = plugins.get(id)?.routes;
    if (!routes) throw new HttpError(404, "plugin.unavailable");
    const url = new URL(c.req.url);
    url.pathname = url.pathname.slice(`/api/plugins/${id}`.length);
    return routes.fetch(new Request(url, c.req.raw));
  });
}
