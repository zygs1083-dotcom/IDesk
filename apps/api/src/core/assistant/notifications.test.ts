import { eq } from "drizzle-orm";
import { expect, test, vi } from "vitest";
import { z } from "zod";
import { db } from "../../db/client.ts";
import { events, taskOrigins } from "../../db/schema.ts";
import { configurePlugin, enablePlugin, registerPlugin } from "../../plugins/registry.ts";
import type { ChannelPlugin } from "../../plugins/types.ts";
import { registerAgent } from "../agents/agents.ts";
import { emitEvent } from "../events/bus.ts";
import { createTask } from "../tasks/store.ts";
import { actOnTask } from "../tasks/transition.ts";
import { person } from "./fixture.ts";
import { startAssistantNotifications } from "./notifications.ts";

test("source notifications send claim, accept, complete and cancel; failures log once and web does not push", async () => {
  const send = vi.fn<ChannelPlugin["send"]>(async () => {});
  const plugin: ChannelPlugin = {
    id: "notify-fixture",
    name: "Notify",
    version: "1",
    kind: "channel",
    channel: "feishu",
    configSchema: z.object({ secret: z.string().optional() }),
    send,
  };
  await registerPlugin(plugin, new URL("file:///notify-fixture.ts"));
  await configurePlugin(plugin.id, { secret: "fake-notify-secret" });
  await enablePlugin(plugin.id);
  const stop = startAssistantNotifications();
  try {
    const publisher = person();
    const { agent } = registerAgent({
      name: "Working agent",
      kind: "codex",
      host: "local",
      capabilities: [],
    });
    const actor = { kind: "agent" as const, id: agent.id, capabilities: [] };
    const task = createTask({ title: "Origin" }, publisher.id);
    db.insert(taskOrigins)
      .values({ taskId: task.id, channel: "feishu", chatId: "origin-chat", personId: publisher.id })
      .run();
    actOnTask(task.id, { type: "claim" }, actor);
    actOnTask(task.id, { type: "complete", result: "result ".repeat(100) }, actor);
    const assigned = createTask({ title: "Assigned" }, publisher.id);
    db.insert(taskOrigins)
      .values({
        taskId: assigned.id,
        channel: "feishu",
        chatId: "origin-chat",
        personId: publisher.id,
      })
      .run();
    actOnTask(assigned.id, { type: "assign", agentId: agent.id }, { kind: "human" });
    actOnTask(assigned.id, { type: "accept" }, actor);
    actOnTask(assigned.id, { type: "cancel" }, { kind: "person", id: publisher.id });
    expect(send).toHaveBeenCalledTimes(4);
    expect(send.mock.calls[0]?.[1]).toMatchObject({
      text: expect.stringContaining("Working agent 开始处理 Origin"),
    });
    expect(send.mock.calls[1]?.[1]).toMatchObject({
      text: expect.stringContaining(`/desk?task=${task.id}`),
    });
    expect(send.mock.calls[1]?.[1]?.text).not.toContain("result ".repeat(100));
    const web = createTask({ title: "Web no origin" }, publisher.id);
    actOnTask(web.id, { type: "claim" }, actor);
    expect(send).toHaveBeenCalledTimes(4);
    send.mockRejectedValueOnce(new Error("send failed fake-notify-secret"));
    emitEvent({ type: "task.cancel", taskId: assigned.id });
    await vi.waitFor(() =>
      expect(
        db.select().from(events).where(eq(events.type, "assistant.notify_failed")).all(),
      ).toHaveLength(1),
    );
    expect(
      db.select().from(events).where(eq(events.type, "assistant.notify_failed")).get()?.payload,
    ).toEqual({ taskId: assigned.id, channel: "feishu", error: "send failed ••••••" });
    expect(send).toHaveBeenCalledTimes(5);
  } finally {
    stop();
  }
});
