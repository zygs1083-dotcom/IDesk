import { Cron } from "croner";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { emitEvent, onEvent } from "../core/events/bus.ts";
import { db } from "../db/client.ts";
import { pluginState } from "../db/schema.ts";
import type { ConnectorPlugin, Plugin, Unsubscribe } from "./types.ts";

type LoadedPlugin = {
  plugin: Plugin;
  source: URL;
  enabled: boolean;
  subscriptions: Unsubscribe[];
  crons: Cron[];
  routes?: Hono;
};
export const plugins = new Map<string, LoadedPlugin>();

async function setup(loaded: LoadedPlugin): Promise<void> {
  await loaded.plugin.setup?.({
    db,
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
}

async function teardown(loaded: LoadedPlugin): Promise<void> {
  if (!loaded.enabled) return;
  await loaded.plugin.teardown?.();
  for (const unsubscribe of loaded.subscriptions) unsubscribe();
  for (const cron of loaded.crons) cron.stop();
  loaded.subscriptions = [];
  loaded.crons = [];
  delete loaded.routes;
  loaded.enabled = false;
}

export async function registerPlugin(plugin: Plugin, source: URL): Promise<void> {
  const loaded: LoadedPlugin = { plugin, source, enabled: false, subscriptions: [], crons: [] };
  plugins.set(plugin.id, loaded);
  const state = db.select().from(pluginState).where(eq(pluginState.pluginId, plugin.id)).get();
  if (state?.enabled !== false) await setup(loaded);
}

export async function enablePlugin(id: string): Promise<void> {
  const loaded = plugins.get(id);
  if (!loaded || loaded.enabled) return;
  db.insert(pluginState)
    .values({ pluginId: id, enabled: true })
    .onConflictDoUpdate({ target: pluginState.pluginId, set: { enabled: true } })
    .run();
  await setup(loaded);
}

export async function disablePlugin(id: string): Promise<void> {
  const loaded = plugins.get(id);
  if (!loaded?.enabled) return;
  db.insert(pluginState)
    .values({ pluginId: id, enabled: false })
    .onConflictDoUpdate({ target: pluginState.pluginId, set: { enabled: false } })
    .run();
  await teardown(loaded);
}

export async function reloadPlugin(id: string): Promise<void> {
  const loaded = plugins.get(id);
  if (!loaded) return;
  const enabled = loaded.enabled;
  await teardown(loaded);
  const source = new URL(loaded.source);
  source.searchParams.set("t", String(Date.now()));
  const { default: plugin }: { default: Plugin } = await import(source.href);
  loaded.source = source;
  loaded.plugin = plugin;
  if (enabled) await setup(loaded);
}

export function listPlugins() {
  return [...plugins.values()].map(({ plugin, enabled }) => ({
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    kind: plugin.kind,
    enabled,
  }));
}

export function connectorPlugin(id: string): ConnectorPlugin | undefined {
  const loaded = plugins.get(id);
  if (loaded?.enabled && loaded.plugin.kind === "connector")
    return loaded.plugin as ConnectorPlugin;
}

export async function stopPlugins(): Promise<void> {
  for (const loaded of plugins.values()) await teardown(loaded);
  plugins.clear();
}
