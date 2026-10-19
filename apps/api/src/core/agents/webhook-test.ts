import { createHmac } from "node:crypto";
import type { webhookTestResultSchema } from "@idesk/shared/agent-schemas";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import type { z } from "zod";
import { db } from "../../db/client.ts";
import { agents } from "../../db/schema.ts";
import { HttpError } from "../../http/errors.ts";
import { plugins } from "../../plugins/registry.ts";

export async function testAgentWebhook(
  id: string,
): Promise<z.infer<typeof webhookTestResultSchema> | null> {
  const agent = db.select().from(agents).where(eq(agents.id, id)).get();
  if (!agent) return null;
  if (agent.webhookUrl === null) throw new HttpError(400, "agent.noWebhook");

  const body = JSON.stringify({
    id: ulid(),
    ts: new Date().toISOString(),
    type: "webhook.test",
    taskId: null,
    agentId: null,
    payload: {},
  });
  const signature = createHmac("sha256", agent.apiKeyHash).update(body).digest("hex");
  const notifierEnabled = plugins.get("webhook-notifier")?.enabled === true;
  const startedAt = Date.now();
  try {
    const response = await fetch(agent.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-IDesk-Signature": `sha256=${signature}` },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    await response.body?.cancel();
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      error: response.ok ? null : `HTTP ${response.status}`,
      notifierEnabled,
    };
  } catch (failure) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      error:
        failure instanceof Error && failure.name === "TimeoutError"
          ? "Request timed out"
          : "HTTP request failed",
      notifierEnabled,
    };
  }
}
