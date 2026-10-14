import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.ts";
import { pluginState } from "../db/schema.ts";
import { clearRegistrations, type LoadedPlugin, setup } from "./setup.ts";
import type { ConnectorPlugin, Plugin } from "./types.ts";

export const plugins = new Map<string, LoadedPlugin>();

async function teardown(loaded: LoadedPlugin): Promise<void> {
  if (!loaded.enabled) return;
  await loaded.plugin.teardown?.();
  clearRegistrations(loaded);
}

export async function registerPlugin(plugin: Plugin, source: URL): Promise<void> {
  const loaded: LoadedPlugin = { plugin, source, enabled: false, subscriptions: [], crons: [] };
  plugins.set(plugin.id, loaded);
  const state = db.select().from(pluginState).where(eq(pluginState.pluginId, plugin.id)).get();
  if (state ? state.enabled : plugin.enabledByDefault !== false) await setup(loaded);
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
  if (!loaded || (!loaded.enabled && loaded.error === undefined)) return;
  db.insert(pluginState)
    .values({ pluginId: id, enabled: false })
    .onConflictDoUpdate({ target: pluginState.pluginId, set: { enabled: false } })
    .run();
  await teardown(loaded);
  delete loaded.error;
}

export async function reloadPlugin(id: string): Promise<void> {
  const loaded = plugins.get(id);
  if (!loaded) return;
  const enabled = loaded.enabled || loaded.error !== undefined;
  await teardown(loaded);
  const source = new URL(loaded.source);
  source.searchParams.set("t", String(Date.now()));
  const { default: plugin }: { default: Plugin } = await import(source.href);
  loaded.source = source;
  loaded.plugin = plugin;
  delete loaded.error;
  if (enabled) await setup(loaded);
}

export async function configurePlugin(id: string, config: Record<string, unknown>): Promise<void> {
  const loaded = plugins.get(id);
  if (!loaded) return;
  const enabled = loaded.enabled || loaded.error !== undefined;
  db.insert(pluginState)
    .values({ pluginId: id, enabled, config })
    .onConflictDoUpdate({ target: pluginState.pluginId, set: { config } })
    .run();
  if (enabled) {
    await teardown(loaded);
    await setup(loaded);
  }
}

export function listPlugins() {
  return [...plugins.values()].map(({ plugin, enabled, error }) => ({
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    kind: plugin.kind,
    enabled,
    ...(error !== undefined ? { error } : {}),
    config:
      plugin.kind === "connector"
        ? {}
        : (db.select().from(pluginState).where(eq(pluginState.pluginId, plugin.id)).get()?.config ??
          {}),
    configSchema: z.toJSONSchema(plugin.configSchema, { io: "input" }),
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
