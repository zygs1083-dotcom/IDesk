import { z } from "zod";

const schema = z.object({
  IDESK_PORT: z.coerce.number().default(3300),
  IDESK_DATA_DIR: z.string().default("./data"),
  IDESK_ADMIN_PASSWORD: z.string().min(1),
  IDESK_SESSION_SECRET: z.string().min(16),
  IDESK_PLUGIN_DIR: z.string().optional(),
  IDESK_PUBLIC_URL: z.string().url().optional(),
  IDESK_WEB_DIST: z.string().optional(),
});

export type Config = z.infer<typeof schema>;

export const config: Config = schema.parse(process.env);
