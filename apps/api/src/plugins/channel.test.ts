import type {
  AssistantConnectionStatus,
  AssistantReceiveInput,
} from "@idesk/shared/assistant-schemas";
import { expect, test, vi } from "vitest";
import { z } from "zod";
import { fakeModel, nativeReply, person } from "../core/assistant/fixture.ts";
import { createBindCode } from "../core/people/codes.ts";
import {
  channelPlugin,
  channelStatuses,
  configurePlugin,
  disablePlugin,
  enablePlugin,
  listPlugins,
  registerPlugin,
} from "./registry.ts";
import type { ChannelPlugin } from "./types.ts";

test("channels default off; enabled setup failures stay visible, configure/disable cleanly transition and old callbacks expire", async () => {
  let status: (input: AssistantConnectionStatus) => void = () => {};
  let receive: (input: AssistantReceiveInput) => Promise<void> = async () => {};
  const teardown = vi.fn();
  const plugin: ChannelPlugin = {
    id: "channel-fixture",
    name: "Fixture",
    version: "1",
    kind: "channel",
    channel: "feishu",
    configSchema: z.object({ secret: z.string().min(1) }),
    setup(ctx) {
      status = ctx.assistant.status;
      receive = ctx.assistant.receive;
      ctx.assistant.status({ connected: true });
    },
    teardown,
    send: vi.fn(),
  };
  await registerPlugin(plugin, new URL("file:///channel-fixture.ts"));
  expect(channelStatuses()[0]).toMatchObject({
    channel: "feishu",
    enabled: false,
    connected: false,
  });
  await enablePlugin(plugin.id);
  expect(channelStatuses()[0]).toMatchObject({
    enabled: true,
    connected: false,
    lastError: expect.any(String),
  });
  expect(listPlugins().find((item) => item.id === plugin.id)).toMatchObject({
    enabled: true,
    error: expect.any(String),
  });
  await configurePlugin(plugin.id, { secret: "fake-platform-secret" });
  expect(channelStatuses()[0]).toMatchObject({ enabled: true, connected: true, lastError: null });
  expect(channelPlugin("feishu")).toBe(plugin);
  status({ connected: false, lastError: "bad fake-platform-secret" });
  expect(channelStatuses()[0]?.lastError).toBe("bad ••••••");
  status({ connected: true });
  const publisher = person();
  const requests = await fakeModel(() => nativeReply("openai-chat"));
  const reply = vi.fn(async () => {});
  const input = {
    channel: "feishu" as const,
    chatId: "chat",
    externalUserId: "external",
    displayName: "fixture",
    isGroup: true,
    reply,
  };
  await receive({ ...input, text: `绑定 ${createBindCode(publisher.id).code}` });
  await receive({ ...input, text: "hello" });
  expect(requests).toHaveLength(1);
  expect(channelStatuses()[0]?.lastMessageAt).not.toBeNull();
  await disablePlugin(plugin.id);
  const before = reply.mock.calls.length;
  await receive({ ...input, text: "disabled" });
  status({ connected: true });
  expect(reply).toHaveBeenCalledTimes(before);
  expect(channelPlugin("feishu")).toBeUndefined();
  expect(channelStatuses()[0]).toMatchObject({ enabled: false, connected: false, lastError: null });
  expect(teardown).toHaveBeenCalled();
});

test("disable stops inbound callbacks before an asynchronous SDK teardown finishes", async () => {
  let receive: (input: AssistantReceiveInput) => Promise<void> = async () => {};
  let release: () => void = () => {};
  const closing = new Promise<void>((resolve) => {
    release = resolve;
  });
  const plugin: ChannelPlugin = {
    id: "closing-fixture",
    name: "Closing",
    version: "1",
    kind: "channel",
    channel: "wecom",
    configSchema: z.object({}),
    setup(ctx) {
      receive = ctx.assistant.receive;
      ctx.assistant.status({ connected: true });
    },
    async teardown() {
      await closing;
    },
    send: vi.fn(),
  };
  await registerPlugin(plugin, new URL("file:///closing-fixture.ts"));
  await enablePlugin(plugin.id);
  const pending = disablePlugin(plugin.id);
  const reply = vi.fn(async () => {});
  await receive({
    channel: "wecom",
    chatId: "chat",
    externalUserId: "external",
    displayName: "test",
    isGroup: false,
    text: "hello",
    reply,
  });
  expect(reply).not.toHaveBeenCalled();
  expect(channelStatuses().find((status) => status.channel === "wecom")).toMatchObject({
    enabled: false,
    connected: false,
  });
  release();
  await pending;
});
