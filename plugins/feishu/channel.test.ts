import { expect, test } from "vitest";
import {
  context,
  event,
  flush,
  message,
  plugin,
  receive,
  sdk,
  status,
} from "./test/channel-fixture.ts";

test("single text uses open_id and receives a working text/options reply", async () => {
  await plugin.setup(context());
  await event("im.message.receive_v1", message());
  await flush();
  const input = receive.mock.calls[0]?.[0];
  expect(input).toMatchObject({
    channel: "feishu",
    chatId: "oc_fake",
    externalUserId: "ou_sender",
    displayName: "ou_sender",
    text: "绑定 abc123",
    isGroup: false,
  });
  await input?.reply({ text: "已绑定" });
  expect(sdk.create).toHaveBeenLastCalledWith({
    params: { receive_id_type: "chat_id" },
    data: { receive_id: "oc_fake", msg_type: "text", content: '{"text":"已绑定"}' },
  });
  await input?.reply({ text: "请确认", options: [{ id: "publish", label: "发布" }] });
  const request = sdk.create.mock.lastCall?.[0];
  expect(request.data.msg_type).toBe("interactive");
  expect(JSON.parse(request.data.content)).toMatchObject({
    schema: "2.0",
    body: {
      elements: [
        { tag: "markdown", content: "请确认" },
        { tag: "button", behaviors: [{ type: "callback", value: { action: "action:publish" } }] },
      ],
    },
  });
});

test("group ignores other mentions and strips only the bot mention", async () => {
  await plugin.setup(context());
  const mentions = [{ key: "@_user_1", id: { open_id: "ou_other" }, name: "同事" }];
  await event("im.message.receive_v1", message({ chat_type: "group", mentions }));
  expect(receive).not.toHaveBeenCalled();
  mentions.push({ key: "@_user_2", id: { open_id: "ou_bot" }, name: "IDesk" });
  await event(
    "im.message.receive_v1",
    message({ chat_type: "group", mentions, content: '{"text":"@_user_2 发布 @_user_1"}' }),
  );
  await flush();
  expect(receive.mock.lastCall?.[0]).toMatchObject({ text: "发布 @_user_1", isGroup: true });
});

test.each(["image", "file", "audio"])("%s receives text-only guidance", async (message_type) => {
  await plugin.setup(context());
  await event("im.message.receive_v1", message({ message_type, content: "{}" }));
  await flush();
  expect(receive).not.toHaveBeenCalled();
  expect(sdk.create.mock.lastCall?.[0].data.content).toBe('{"text":"目前只支持文字"}');
});

test("card callback acknowledges while model remains pending, trusting platform identity only", async () => {
  await plugin.setup(context());
  receive.mockImplementation(() => new Promise(() => {}));
  await expect(
    event("card.action.trigger", {
      operator: { open_id: "ou_clicker" },
      context: { open_chat_id: "oc_fake" },
      action: { value: { action: "action:publish", personId: "p_forged" } },
    }),
  ).resolves.toEqual({});
  await flush();
  expect(receive.mock.lastCall?.[0]).toMatchObject({
    externalUserId: "ou_clicker",
    action: "publish",
    isGroup: true,
  });
  expect(receive.mock.lastCall?.[0]).not.toHaveProperty("personId");
});

test("proactive send targets the original chat and masks transport errors", async () => {
  await plugin.setup(context());
  await plugin.send("oc_original", { text: "任务完成" });
  expect(sdk.create.mock.lastCall?.[0].data.receive_id).toBe("oc_original");
  sdk.create.mockRejectedValue(new Error("fake-secret"));
  await expect(plugin.send("oc_original", { text: "x" })).rejects.toThrow("飞书消息发送失败");
  await expect(plugin.send("oc_original", { text: "x" })).rejects.not.toThrow("fake-secret");
});

test("missing config and authentication failure are isolated and sanitized", async () => {
  await plugin.setup(context({ appId: "", appSecret: "" }));
  expect(status.mock.lastCall?.[0]).toMatchObject({
    connected: false,
    lastError: expect.stringContaining("连接失败"),
  });
  expect(sdk.request).not.toHaveBeenCalled();
  sdk.request.mockRejectedValue(new Error("fake-secret"));
  await plugin.setup(context());
  expect(status.mock.lastCall?.[0].lastError).not.toContain("fake-secret");
  expect(sdk.close).toHaveBeenCalled();
});

test("SDK lifecycle and teardown update status and release the connection", async () => {
  await plugin.setup(context());
  expect(status).toHaveBeenLastCalledWith({ connected: true });
  sdk.options?.onReconnecting?.();
  expect(status.mock.lastCall?.[0].connected).toBe(false);
  sdk.options?.onReconnected?.();
  expect(status.mock.lastCall?.[0].connected).toBe(true);
  plugin.teardown();
  expect(sdk.close).toHaveBeenCalledWith({ force: true });
  sdk.options?.onReconnected?.();
  expect(status.mock.lastCall?.[0].connected).toBe(false);
});
