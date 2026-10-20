import type { AssistantSettings } from "@idesk/shared/assistant-schemas";

export async function modelRequest(settings: AssistantSettings, body: string): Promise<string> {
  if (!URL.canParse(settings.baseUrl)) throw new Error("配置无效");
  const base = new URL(settings.baseUrl);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    !settings.apiKey ||
    !settings.model
  )
    throw new Error("配置无效");
  const anthropic = settings.protocol === "anthropic";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(
      `${settings.baseUrl.replace(/\/+$/, "")}${anthropic ? "/v1/messages" : "/chat/completions"}`,
      {
        method: "POST",
        headers: anthropic
          ? {
              "Content-Type": "application/json",
              "x-api-key": settings.apiKey,
              "anthropic-version": "2023-06-01",
            }
          : { "Content-Type": "application/json", Authorization: `Bearer ${settings.apiKey}` },
        body,
        signal: controller.signal,
        redirect: "error",
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    if (controller.signal.aborted) throw new Error("超时");
    if (error instanceof Error && /^HTTP \d+$/.test(error.message)) throw error;
    throw new Error("连接失败");
  } finally {
    clearTimeout(timer);
  }
}
