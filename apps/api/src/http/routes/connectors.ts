import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  connectionResultSchema,
  connectorSchema,
  createConnectorSchema,
  patchConnectorSchema,
  pollResultSchema,
  testConnectorSchema,
} from "@idesk/shared/automation-schemas";
import { idSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import {
  createConnector,
  deleteConnector,
  getConnector,
  listConnectors,
  mergeSecrets,
  toPublicConnector,
  updateConnector,
} from "../../core/connectors/connectors.ts";
import { pollConnector } from "../../plugins/poll.ts";
import { connectorPlugin } from "../../plugins/registry.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireHuman } from "../middleware/auth.ts";

export const MANUAL_POLL_COOLDOWN_MS = 15_000;
function existingConnector(id: string) {
  const connector = getConnector(id);
  if (!connector) throw new HttpError(404, "连接器不存在");
  return connector;
}
function validatedPlugin(pluginId: string, config: Record<string, unknown>) {
  const plugin = connectorPlugin(pluginId);
  if (!plugin) throw new HttpError(400, "没有这个连接器插件或已停用");
  const parsed = plugin.configSchema.safeParse(config);
  if (!parsed.success)
    throw new HttpError(400, parsed.error.issues.map((issue) => issue.message).join("；"));
  return { plugin, config: parsed.data };
}

export function connectorRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "get",
      path: "/api/v1/connectors",
      responses: {
        200: {
          description: "Connectors",
          content: { "application/json": { schema: z.array(connectorSchema) } },
        },
      },
    },
    (c) => c.json(listConnectors(), 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/connectors",
      middleware: requireHuman,
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: createConnectorSchema } },
        },
      },
      responses: {
        201: {
          description: "Created",
          content: { "application/json": { schema: connectorSchema } },
        },
      },
    },
    async (c) => {
      const input = c.req.valid("json");
      validatedPlugin(input.pluginId, input.config);
      const connector = createConnector(input);
      // 首次轮询在后台跑：项目多时要几十个外部请求，不能让保存按钮等它
      void pollConnector(connector, new Date());
      return c.json(toPublicConnector(connector), 201);
    },
  );
  app.openapi(
    {
      method: "patch",
      path: "/api/v1/connectors/{id}",
      middleware: requireHuman,
      request: {
        params: idSchema,
        body: { required: true, content: { "application/json": { schema: patchConnectorSchema } } },
      },
      responses: {
        200: {
          description: "Updated",
          content: { "application/json": { schema: connectorSchema } },
        },
      },
    },
    (c) => {
      const previous = existingConnector(c.req.valid("param").id);
      const input = c.req.valid("json");
      if (input.config !== undefined) input.config = mergeSecrets(input.config, previous.config);
      if (input.config !== undefined || input.pluginId !== undefined)
        validatedPlugin(input.pluginId ?? previous.pluginId, input.config ?? previous.config);
      const updated = Object.keys(input).length ? updateConnector(previous.id, input) : previous;
      return c.json(toPublicConnector(updated as typeof previous), 200);
    },
  );
  app.openapi(
    {
      method: "delete",
      path: "/api/v1/connectors/{id}",
      middleware: requireHuman,
      request: { params: idSchema },
      responses: { 204: { description: "Deleted" } },
    },
    (c) => {
      if (!deleteConnector(c.req.valid("param").id)) throw new HttpError(404, "连接器不存在");
      return c.body(null, 204);
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/connectors/test",
      middleware: requireHuman,
      request: {
        body: { required: true, content: { "application/json": { schema: testConnectorSchema } } },
      },
      responses: {
        200: {
          description: "Connection result",
          content: { "application/json": { schema: connectionResultSchema } },
        },
      },
    },
    async (c) => {
      const input = c.req.valid("json");
      const config =
        input.id === undefined
          ? input.config
          : mergeSecrets(input.config, existingConnector(input.id).config);
      const validated = validatedPlugin(input.pluginId, config);
      return c.json(await validated.plugin.testConnection(validated.config), 200);
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/connectors/{id}/poll",
      middleware: requireHuman,
      request: { params: idSchema },
      responses: {
        200: {
          description: "Poll result",
          content: { "application/json": { schema: pollResultSchema } },
        },
      },
    },
    async (c) => {
      const connector = existingConnector(c.req.valid("param").id);
      const now = new Date();
      if (
        connector.lastPolledAt !== null &&
        now.getTime() - connector.lastPolledAt.getTime() < MANUAL_POLL_COOLDOWN_MS
      )
        return c.json({ refreshed: false, connector: toPublicConnector(connector) }, 200);
      await pollConnector(connector, now);
      return c.json(
        { refreshed: true, connector: toPublicConnector(existingConnector(connector.id)) },
        200,
      );
    },
  );
}
