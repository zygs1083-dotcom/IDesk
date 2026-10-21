import type { AssistantSettings } from "@idesk/shared/assistant-schemas";
import { db } from "../../db/client.ts";
import { agents, assistantSettings, connectors, pluginState, schedules } from "../../db/schema.ts";
import { MASK, SECRET_KEY } from "../connectors/connectors.ts";

export function modelSettings(): AssistantSettings {
  const row = db.select().from(assistantSettings).get();
  return row
    ? {
        protocol: row.protocol,
        baseUrl: row.baseUrl,
        apiKey: row.apiKey,
        model: row.model,
        enabled: row.enabled,
      }
    : { protocol: "openai-chat", baseUrl: "", apiKey: "", model: "", enabled: false };
}

export function publicSettings(): AssistantSettings {
  const settings = modelSettings();
  return { ...settings, apiKey: settings.apiKey ? MASK : "" };
}

export function saveSettings(input: AssistantSettings): AssistantSettings {
  const settings = {
    ...input,
    apiKey: input.apiKey === MASK ? modelSettings().apiKey : input.apiKey,
  };
  db.insert(assistantSettings)
    .values(settings)
    .onConflictDoUpdate({ target: assistantSettings.id, set: settings })
    .run();
  return publicSettings();
}

export function redact(text: string): string {
  const secrets = [modelSettings().apiKey];
  for (const row of [
    ...db.select({ config: connectors.config }).from(connectors).all(),
    ...db.select({ config: pluginState.config }).from(pluginState).all(),
  ])
    secrets.push(...configSecrets(row.config));
  for (const row of db.select({ url: agents.webhookUrl }).from(agents).all())
    if (row.url) secrets.push(row.url);
  for (const { action } of db.select({ action: schedules.action }).from(schedules).all())
    if (action.type === "http")
      secrets.push(action.url, ...Object.values(action.headers), action.body ?? "");
  for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length))
    text = text.replaceAll(secret, MASK).replaceAll(JSON.stringify(secret).slice(1, -1), MASK);
  return text;
}

function configSecrets(config: Record<string, unknown>): string[] {
  return Object.entries(config).flatMap(([key, value]) =>
    SECRET_KEY.test(key) && typeof value === "string"
      ? [value]
      : value && typeof value === "object" && !Array.isArray(value)
        ? configSecrets(value as Record<string, unknown>)
        : [],
  );
}
