import { expect, test, vi } from "vitest";
import plugin from "./index.ts";
import {
  acknowledge,
  base,
  client,
  connect,
  context,
  deliver,
  downstream,
  endpoint,
  flush,
  http,
  receive,
  status,
} from "./test/channel-fixture.ts";

test("text uses staff identity and replies through private webhook with supported commands", async () => {
  await plugin.setup(context());
  deliver();
  await flush();
  const input = receive.mock.calls[0]?.[0];
  expect(input).toMatchObject({
    channel: "dingtalk",
    externalUserId: "staff-fake",
    displayName: "测试员工",
    text: "绑定 abc123",
    isGroup: false,
  });
  expect(input?.chatId).toBe('{"kind":"single","id":"staff-fake"}');
  expect(input?.chatId).not.toContain("session");
  await input?.reply({
    text: "草稿",
    options: [
      { id: "1", label: "1 低" },
      { id: "4", label: "4 紧急" },
      { id: "publish", label: "发布" },
      { id: "cancel", label: "取消" },
    ],
  });
  expect(http).toHaveBeenLastCalledWith(
    base.sessionWebhook,
    expect.objectContaining({
      body: JSON.stringify({
        msgtype: "text",
        text: { content: "草稿\n1 低\n4 紧急\n发布\n取消" },
      }),
    }),
  );
  await input?.reply({
    text: "确认取消",
    options: [
      { id: "confirm", label: "确认" },
      { id: "cancel", label: "算了" },
    ],
  });
  expect(http.mock.lastCall?.[1]?.body).toBe(
    JSON.stringify({ msgtype: "text", text: { content: "确认取消\n确认\n取消" } }),
  );
  expect(acknowledge).toHaveBeenCalledWith("ack-fake", {});
});

test("group requires isInAtList, preserves cleaned platform text and passes priority number unchanged", async () => {
  await plugin.setup(context());
  deliver(downstream({ conversationType: "2", isInAtList: false }));
  await flush();
  expect(receive).not.toHaveBeenCalled();
  deliver(
    downstream({
      conversationType: "2",
      isInAtList: true,
      text: { content: " 3 " },
      atUsers: [{ dingtalkId: "bot-fake" }],
    }),
  );
  await flush();
  expect(receive.mock.lastCall?.[0]).toMatchObject({
    chatId: '{"kind":"group","id":"cid-fake"}',
    text: "3",
    isGroup: true,
  });
  expect(receive.mock.lastCall?.[0]).not.toHaveProperty("action");
});

test.each(["picture", "file", "audio"])("%s is rejected with text guidance", async (msgtype) => {
  await plugin.setup(context());
  deliver(downstream({ msgtype }));
  await flush();
  expect(receive).not.toHaveBeenCalled();
  expect(http.mock.lastCall?.[1]?.body).toBe(
    '{"msgtype":"text","text":{"content":"目前只支持文字"}}',
  );
});

test.each([
  ['{"kind":"single","id":"staff-fake"}', "oToMessages/batchSend", { userIds: ["staff-fake"] }],
  ['{"kind":"group","id":"cid-fake"}', "groupMessages/send", { openConversationId: "cid-fake" }],
])("proactive route %s does not depend on webhook lifetime", async (chatId, path, target) => {
  await plugin.setup(context());
  await plugin.send(chatId, { text: "任务完成" });
  expect(http).toHaveBeenLastCalledWith(`https://api.dingtalk.com/v1.0/robot/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-acs-dingtalk-access-token": "fake-token" },
    body: JSON.stringify({
      robotCode: "fake-robot",
      msgKey: "sampleText",
      msgParam: '{"content":"任务完成"}',
      ...target,
    }),
  });
});

test("slow receive never blocks Stream callback acknowledgement", async () => {
  await plugin.setup(context());
  receive.mockImplementation(() => new Promise(() => {}));
  deliver();
  expect(acknowledge).toHaveBeenCalledWith("ack-fake", {});
  await flush();
  expect(receive).toHaveBeenCalled();
});

test("missing configuration and authentication failure report safe state and cancel SDK retry on teardown", async () => {
  await plugin.setup(context({ clientKey: "", clientSecret: "", robotCode: "" }));
  expect(status.mock.lastCall?.[0]).toMatchObject({
    connected: false,
    lastError: expect.stringContaining("连接失败"),
  });
  expect(connect).not.toHaveBeenCalled();
  vi.useFakeTimers();
  endpoint.mockRejectedValue(new Error("fake-secret"));
  await plugin.setup(context());
  expect(status.mock.lastCall?.[0].lastError).not.toContain("fake-secret");
  expect(vi.getTimerCount()).toBe(1);
  plugin.teardown();
  expect(vi.getTimerCount()).toBe(0);
});

test("fixed SDK lifecycle markers and system disconnect update state without raw errors", async () => {
  await plugin.setup(context());
  expect(status.mock.lastCall?.[0]).toEqual({ connected: true });
  client?.printDebug("Socket closed");
  expect(status.mock.lastCall?.[0]).toEqual({ connected: false, lastError: "钉钉连接断开" });
  client?.printDebug("SOCKET ERROR");
  expect(status.mock.lastCall?.[0]).toEqual({ connected: false, lastError: "钉钉连接错误" });
  const frame = downstream();
  client?.onSystem({
    ...frame,
    type: "SYSTEM",
    headers: { ...frame.headers, topic: "disconnect" },
  });
  expect(status.mock.lastCall?.[0].connected).toBe(false);
});

test("send failures never expose tokens or secrets", async () => {
  await plugin.setup(context());
  http.mockRejectedValue(new Error("fake-token fake-secret"));
  await expect(plugin.send('{"kind":"single","id":"staff-fake"}', { text: "x" })).rejects.toThrow(
    "钉钉消息发送失败",
  );
  await expect(
    plugin.send('{"kind":"single","id":"staff-fake"}', { text: "x" }),
  ).rejects.not.toThrow("fake-secret");
});
