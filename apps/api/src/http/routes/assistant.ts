import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  assistantChannelsSchema,
  assistantChatSchema,
  assistantReplySchema,
  assistantSettingsSchema,
  assistantTestResultSchema,
} from "@idesk/shared/assistant-schemas";
import { createMiddleware } from "hono/factory";
import { converse } from "../../core/assistant/conversation.ts";
import { testModel } from "../../core/assistant/model.ts";
import { modelSettings, publicSettings, saveSettings } from "../../core/assistant/settings.ts";
import { getPerson } from "../../core/people/people.ts";
import { channelStatuses } from "../../plugins/registry.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireHuman } from "../middleware/auth.ts";

const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  if (c.get("readonly")) throw new HttpError(403, "auth.readOnly");
  await next();
});
export function assistantRoutes(app: OpenAPIHono<AuthEnv>) {
  app.use("/api/v1/assistant/*", requireHuman);
  app.openapi(
    {
      method: "get",
      path: "/api/v1/assistant/settings",
      middleware: requireAdmin,
      responses: {
        200: {
          description: "Assistant settings",
          content: { "application/json": { schema: assistantSettingsSchema } },
        },
      },
    },
    (c) => c.json(publicSettings(), 200),
  );
  app.openapi(
    {
      method: "put",
      path: "/api/v1/assistant/settings",
      middleware: requireAdmin,
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: assistantSettingsSchema } },
        },
      },
      responses: {
        200: {
          description: "Assistant settings",
          content: { "application/json": { schema: assistantSettingsSchema } },
        },
      },
    },
    (c) => c.json(saveSettings(c.req.valid("json")), 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/assistant/test",
      middleware: requireAdmin,
      responses: {
        200: {
          description: "Model test",
          content: { "application/json": { schema: assistantTestResultSchema } },
        },
      },
    },
    async (c) => c.json(await testModel(modelSettings()), 200),
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/assistant/channels",
      responses: {
        200: {
          description: "Channel status",
          content: { "application/json": { schema: assistantChannelsSchema } },
        },
      },
    },
    (c) => c.json(channelStatuses(), 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/assistant/chat",
      middleware: requireAdmin,
      request: {
        body: { required: true, content: { "application/json": { schema: assistantChatSchema } } },
      },
      responses: {
        200: {
          description: "Assistant reply",
          content: { "application/json": { schema: assistantReplySchema } },
        },
      },
    },
    async (c) => {
      const { personId, text } = c.req.valid("json");
      if (!getPerson(personId)) throw new HttpError(400, "person.notFound");
      return c.json(await converse({ channel: "web", chatId: personId, personId }, text), 200);
    },
  );
}
