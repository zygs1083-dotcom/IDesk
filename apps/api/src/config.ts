import { fileURLToPath } from "node:url";
import { z } from "zod";

const schema = z.object({
  IDESK_PORT: z.coerce.number().default(3300),
  IDESK_DATA_DIR: z.string().default("./data"),
  IDESK_ADMIN_PASSWORD: z.string().min(1),
  IDESK_VIEWER_PASSWORD: z.string().min(1).optional(),
  IDESK_SESSION_SECRET: z.string().min(16),
  IDESK_PLUGIN_DIR: z.string().optional(),
  IDESK_PUBLIC_URL: z.string().url().optional(),
  IDESK_OFFICE_DIST: z.string().optional(),
  IDESK_WEB_DIST: z.string().optional(),
  IDESK_PROBE_DIST: z
    .string()
    .default(fileURLToPath(new URL("../../../packages/cli/dist/probe.mjs", import.meta.url))),
  IDESK_AGENT_GUIDE: z
    .string()
    .default(fileURLToPath(new URL("../../../docs/AGENT-GUIDE.md", import.meta.url))),
  IDESK_CLI_DIST: z
    .string()
    .default(fileURLToPath(new URL("../../../packages/cli/dist/main.js", import.meta.url))),
});

export type Config = z.infer<typeof schema>;

export const config: Config = schema.parse(process.env);
