import { readdir } from "node:fs/promises";
import { emitEvent, onEvent } from "../core/events/bus.ts";
import { db } from "../db/client.ts";
import type { Plugin, Unsubscribe } from "./types.ts";

const plugins = new Map<string, { plugin: Plugin; subscriptions: Unsubscribe[] }>();

export async function startPlugins(): Promise<void> {
  const directory = new URL("../../../../plugins/", import.meta.url);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const { default: plugin }: { default: Plugin } = await import(
      new URL(`${entry.name}/index.ts`, directory).href
    );
    const subscriptions: Unsubscribe[] = [];
    plugins.set(plugin.id, { plugin, subscriptions });
    await plugin.setup?.({
      db,
      events: {
        emit: emitEvent,
        on: (type, listener) => {
          const unsubscribe = onEvent(type, listener);
          subscriptions.push(unsubscribe);
          return unsubscribe;
        },
      },
    });
  }
}

export async function stopPlugins(): Promise<void> {
  for (const { plugin, subscriptions } of plugins.values()) {
    await plugin.teardown?.();
    for (const unsubscribe of subscriptions) unsubscribe();
  }
  plugins.clear();
}
