import type { connectionResultSchema, connectorSchema } from "@idesk/shared/automation-schemas";
import type { pluginSchema } from "@idesk/shared/plugin-schemas";
import type { z } from "zod";

export type Connector = z.infer<typeof connectorSchema>;
export type Plugin = z.infer<typeof pluginSchema>;
export type ConnectionResult = z.infer<typeof connectionResultSchema>;
