import { z } from "zod";

export const pluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  kind: z.enum(["connector", "notifier", "action"]),
  enabled: z.boolean(),
});
