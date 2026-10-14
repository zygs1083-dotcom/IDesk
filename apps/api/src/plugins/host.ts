import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { IDeskPlugin } from "@idesk/plugin-sdk";

/**
 * Plugin host (M3/M4 fills in polling + hot reload). Scans `plugins/<id>/src/index.ts`
 * (dev) or `plugins/<id>/dist/index.js` (prod) and any `IDESK_PLUGINS_DIR` and registers
 * every module whose default export is a plugin. Core never imports a plugin directly.
 */
export class PluginHost {
  private plugins = new Map<string, IDeskPlugin>();
  private generation = 0;

  constructor(private readonly dirs: string[]) {}

  list(): IDeskPlugin[] {
    return [...this.plugins.values()];
  }

  get(id: string): IDeskPlugin | undefined {
    return this.plugins.get(id);
  }

  async load(): Promise<{ loaded: string[]; errors: { file: string; error: string }[] }> {
    this.generation += 1;
    const next = new Map<string, IDeskPlugin>();
    const loaded: string[] = [];
    const errors: { file: string; error: string }[] = [];
    for (const dir of this.dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const file = this.entryFile(path.join(dir, entry.name));
        if (!file) continue;
        try {
          const mod = (await import(`${pathToFileURL(file).href}?gen=${this.generation}`)) as { default?: IDeskPlugin };
          const plugin = mod.default;
          if (!plugin || typeof plugin.id !== "string" || plugin.kind !== "connector") {
            errors.push({ file, error: "default export is not an IDesk plugin" });
            continue;
          }
          next.set(plugin.id, plugin);
          loaded.push(plugin.id);
        } catch (err) {
          errors.push({ file, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
    this.plugins = next;
    return { loaded, errors };
  }

  private entryFile(pluginDir: string): string | null {
    for (const candidate of ["dist/index.js", "src/index.ts", "index.js", "index.ts"]) {
      const p = path.join(pluginDir, candidate);
      if (fs.existsSync(p)) return p;
    }
    return null;
  }
}
