import type { createConnectorSchema, patchConnectorSchema } from "@idesk/shared/automation-schemas";
import { asc, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.ts";
import { connectors } from "../../db/schema.ts";
import { polling } from "../../plugins/poll.ts";
import { connectorPlugin } from "../../plugins/registry.ts";

export const MASK = "••••••";
export const SECRET_KEY = /token|key|secret|password|webhookUrl/i;
export function maskConfig(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      SECRET_KEY.test(key) && typeof value === "string" ? MASK : value,
    ]),
  );
}
export function mergeSecrets(
  next: Record<string, unknown>,
  previous: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(next).map(([key, value]) => [key, value === MASK ? previous[key] : value]),
  );
}
export function toPublicConnector(row: typeof connectors.$inferSelect) {
  return {
    ...row,
    canTrigger: connectorPlugin(row.pluginId)?.trigger !== undefined,
    config: maskConfig(row.config),
    progress: polling.get(row.id) ?? null,
  };
}
export function listConnectors() {
  return db.select().from(connectors).orderBy(asc(connectors.name)).all().map(toPublicConnector);
}
export function getConnector(id: string) {
  return db.select().from(connectors).where(eq(connectors.id, id)).get();
}
export function createConnector(input: z.infer<typeof createConnectorSchema>) {
  return db.insert(connectors).values(input).returning().get();
}
export function updateConnector(id: string, input: z.infer<typeof patchConnectorSchema>) {
  return db.update(connectors).set(input).where(eq(connectors.id, id)).returning().get();
}
export function deleteConnector(id: string) {
  return db.delete(connectors).where(eq(connectors.id, id)).returning().get();
}
