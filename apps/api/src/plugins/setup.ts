import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { AssistantChannelStatus } from "@idesk/shared/assistant-schemas";
import { Cron } from "croner";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { ZodError } from "zod";
import { config } from "../config.ts";
import { receive } from "../core/assistant/receive.ts";
import { redact } from "../core/assistant/settings.ts";
import { emitEvent, onEvent } from "../core/events/bus.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { db } from "../db/client.ts";
import { pluginState } from "../db/schema.ts";
import type { ChannelPlugin, Plugin, Unsubscribe } from "./types.ts";

export type LoadedPlugin = {
  plugin: Plugin;
  source: URL;
  enabled: boolean;
  error?: string;
  subscriptions: Unsubscribe[];
  crons: Cron[];
  routes?: Hono;
  connection: Pick<AssistantChannelStatus, "connected" | "lastError" | "lastMessageAt">;
};

export function clearRegistrations(loaded: LoadedPlugin): void {
  for (const unsubscribe of loaded.subscriptions) unsubscribe();
  for (const cron of loaded.crons) cron.stop();
  loaded.subscriptions = [];
  loaded.crons = [];
  delete loaded.routes;
  loaded.enabled = false;
  loaded.connection.connected = false;
}

export async function setup(loaded: LoadedPlugin): Promise<void> {
  const { plugin } = loaded;
  const state = db.select().from(pluginState).where(eq(pluginState.pluginId, plugin.id)).get();
  const dataDir = join(config.IDESK_DATA_DIR, "plugin-data", plugin.id);
  mkdirSync(dataDir, { recursive: true });
  delete loaded.error;
  loaded.connection.connected = false;
  loaded.connection.lastError = null;
  let active = true;
  loaded.subscriptions.push(() => {
    active = false;
  });
  if (plugin.kind === "channel") loaded.enabled = true;
  try {
    const parsed =
      plugin.kind === "connector" ? undefined : plugin.configSchema.parse(state?.config ?? {});
    await plugin.setup?.({
      db,
      config: parsed,
      dataDir,
      publicUrl: config.IDESK_PUBLIC_URL,
      tasks: { act: (id, action) => actOnTask(id, action, { kind: "system" }) },
      assistant: {
        receive: async (input) => {
          if (
            !active ||
            plugin.kind !== "channel" ||
            (plugin as ChannelPlugin).channel !== input.channel
          )
            return;
          loaded.connection.lastMessageAt = new Date().toISOString();
          await receive(input);
        },
        status: (status) => {
          if (!active || plugin.kind !== "channel") return;
          loaded.connection.connected = status.connected;
          loaded.connection.lastError = status.lastError ? redact(status.lastError) : null;
        },
      },
      events: {
        emit: emitEvent,
        on: (type, listener) => {
          const unsubscribe = onEvent(type, listener);
          loaded.subscriptions.push(unsubscribe);
          return unsubscribe;
        },
      },
      schedule: (expression, fn) => {
        const cron = new Cron(expression, fn);
        loaded.crons.push(cron);
        return () => cron.stop();
      },
      registerRoutes: (app) => {
        loaded.routes = app;
      },
    });
    loaded.enabled = true;
  } catch (error) {
    clearRegistrations(loaded);
    loaded.error =
      error instanceof ZodError
        ? error.issues.map((issue) => issue.message).join("；")
        : error instanceof Error
          ? error.message
          : String(error);
    loaded.error = redact(loaded.error);
    if (plugin.kind === "channel") {
      loaded.enabled = true;
      loaded.connection.lastError = loaded.error;
    }
  }
}
