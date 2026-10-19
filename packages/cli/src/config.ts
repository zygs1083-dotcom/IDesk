import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type Config = { url: string; key: string };

export const configDir = () => join(homedir(), ".config/idesk");
const configPath = () => join(configDir(), "config.json");

export async function readConfig(): Promise<Config> {
  try {
    return JSON.parse(await readFile(configPath(), "utf8"));
  } catch {
    throw new Error("先运行 idesk login");
  }
}

export async function saveConfig(config: Config): Promise<string> {
  await mkdir(dirname(configPath()), { recursive: true });
  await writeFile(configPath(), JSON.stringify(config, null, 2), { mode: 0o600 });
  return configPath();
}
