import { glob } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "../config.ts";
import { registerPlugin, stopPlugins } from "./registry.ts";
import type { Plugin } from "./types.ts";

export { stopPlugins };

export async function startPlugins(): Promise<void> {
  const directories = [
    { directory: new URL("../../../../plugins/", import.meta.url), entry: "index.ts" },
  ];
  if (config.IDESK_PLUGIN_DIR) {
    directories.push({
      directory: pathToFileURL(`${resolve(config.IDESK_PLUGIN_DIR)}/`),
      entry: "index.js",
    });
  }
  for (const { directory, entry } of directories) {
    for await (const path of glob(`*/${entry}`, { cwd: directory })) {
      const source = new URL(path, directory);
      const { default: plugin }: { default: Plugin } = await import(source.href);
      await registerPlugin(plugin, source);
    }
  }
}
