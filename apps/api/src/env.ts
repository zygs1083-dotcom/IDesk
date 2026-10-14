import { z } from "zod";
import path from "node:path";

const envSchema = z.object({
  IDESK_PORT: z.coerce.number().int().positive().default(7070),
  IDESK_HOST: z.string().default("0.0.0.0"),
  IDESK_DATA_DIR: z.string().default(path.resolve(process.cwd(), "../../data")),
  IDESK_ADMIN_PASSWORD: z.string().min(1).default("change-me"),
  IDESK_SECRET: z.string().min(8).default("dev-secret-change-me"),
  IDESK_ADMIN_TOKEN: z.string().optional(),
  IDESK_REGISTRATION_TOKEN: z.string().optional(),
  IDESK_ALLOW_PRIVATE_DESTINATIONS: z
    .string()
    .default("true")
    .transform((v) => v !== "false" && v !== "0"),
  IDESK_WEB_DIST: z.string().optional(),
  NODE_ENV: z.string().default("development"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
