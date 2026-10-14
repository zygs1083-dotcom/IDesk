import { createHmac } from "node:crypto";
import { eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import type { Event } from "../../apps/api/src/core/events/bus.ts";
import { agents, tasks } from "../../apps/api/src/db/schema.ts";
import type { Plugin, PluginContext } from "../../apps/api/src/plugins/types.ts";
import type { RelayRecipient } from "../../packages/shared/src/relay.ts";

type Task = typeof tasks.$inferSelect;
type Agent = typeof agents.$inferSelect;

function receives(agent: Agent, to: RelayRecipient): boolean {
  switch (to.kind) {
    case "agent":
      return agent.id === to.id;
    case "capability":
      return agent.capabilities.includes(to.value);
    case "broadcast":
      return true;
  }
}

function assigned(ctx: PluginContext, event: Event): Agent[] {
  const task = ctx.db
    .select()
    .from(tasks)
    .where(eq(tasks.id, event.taskId as string))
    .get() as Task;
  return task.assigneeId === null
    ? []
    : ctx.db.select().from(agents).where(eq(agents.id, task.assigneeId)).all();
}

const recipients: Record<string, (ctx: PluginContext, event: Event) => Agent[]> = {
  "task.created": (ctx, event) => {
    const task = ctx.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, event.taskId as string))
      .get() as Task;
    return ctx.db
      .select()
      .from(agents)
      .where(isNotNull(agents.webhookUrl))
      .all()
      .filter((agent) =>
        task.capabilities.every((capability) => agent.capabilities.includes(capability)),
      );
  },
  "task.assign": assigned,
  "task.handoff": (ctx, event) => (event.payload.handoffTo == null ? [] : assigned(ctx, event)),
  "relay.sent": (ctx, event) => {
    const to = event.payload.to as RelayRecipient;
    return ctx.db
      .select()
      .from(agents)
      .where(isNotNull(agents.webhookUrl))
      .all()
      .filter((agent) => agent.id !== event.agentId && receives(agent, to));
  },
};

async function deliver(ctx: PluginContext, agent: Agent, event: Event): Promise<void> {
  const body = JSON.stringify(event);
  const signature = createHmac("sha256", agent.apiKeyHash).update(body).digest("hex");
  let error = "";
  for (const delay of [0, 1000, 5000, 30000]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const response = await fetch(agent.webhookUrl as string, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-IDesk-Signature": `sha256=${signature}` },
        body,
      });
      await response.body?.cancel();
      if (response.ok) return;
      error = `HTTP ${response.status}`;
    } catch (failure) {
      error = failure instanceof Error ? failure.message : String(failure);
    }
  }
  ctx.events.emit({
    type: "webhook.failed",
    payload: { agentId: agent.id, eventId: event.id, error },
  });
}

export default {
  id: "webhook-notifier",
  name: "Webhook notifier",
  version: "0.1.0",
  kind: "notifier",
  configSchema: z.object({}),
  setup(ctx) {
    ctx.events.on("*", (event) => {
      const find = recipients[event.type];
      if (!find) return;
      for (const agent of find(ctx, event)) {
        if (agent.webhookUrl !== null) void deliver(ctx, agent, event);
      }
    });
  },
} satisfies Plugin;
