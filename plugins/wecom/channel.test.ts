import { type EventMessage, EventType, type WsFrame } from "@wecom/aibot-node-sdk";
import { expect, test } from "vitest";
import { context, flush, frame, plugin, receive, sdk, status } from "./test/channel-fixture.ts";

test("single text carries userid and replies once with finished stream or template buttons", async () => {
  plugin.setup(context());
  sdk.ws?.emit("message", frame());
  await flush();
  const input = receive.mock.calls[0]?.[0];
  expect(input).toMatchObject({
    channel: "wecom",
    chatId: "user-fake",
    externalUserId: "user-fake",
    displayName: "user-fake",
    text: "绑定 abc123",
    isGroup: false,
  });
  await input?.reply({ text: "完成" });
  expect(sdk.stream).toHaveBeenLastCalledWith(frame(), "fake-request", "完成", true);
  const fullDraft = "完整任务草稿：".repeat(20);
  await input?.reply({ text: fullDraft, options: [{ id: "publish", label: "发布" }] });
  expect(sdk.stream).toHaveBeenLastCalledWith(frame(), "fake-request", fullDraft, true);
  expect(sdk.card.mock.lastCall?.[1]).toMatchObject({
    card_type: "button_interaction",
    main_title: { title: "IDesk" },
    button_list: [{ text: "发布", key: "action:publish" }],
    task_id: expect.any(String),
  });
});

test("group callback uses chatid and already stripped platform text, malformed group lacks route", async () => {
  plugin.setup(context());
  sdk.ws?.emit(
    "message",
    frame({ chattype: "group", chatid: "group-fake", text: { content: " 发布 " } }),
  );
  await flush();
  expect(receive.mock.lastCall?.[0]).toMatchObject({
    chatId: "group-fake",
    isGroup: true,
    text: "发布",
  });
  receive.mockClear();
  sdk.ws?.emit("message", frame({ chattype: "group" }));
  await flush();
  expect(receive).not.toHaveBeenCalled();
});

test.each(["image", "file", "voice", "mixed"])(
  "%s remains unsupported even if SDK carries transcription",
  async (msgtype) => {
    plugin.setup(context());
    sdk.ws?.emit("message", frame({ msgtype, voice: { content: "publish" } }));
    await flush();
    expect(receive).not.toHaveBeenCalled();
    expect(sdk.stream.mock.lastCall?.slice(1)).toEqual(["fake-request", "目前只支持文字", true]);
  },
);

test("template button acknowledges first and then calls receive with platform user and action", async () => {
  plugin.setup(context());
  receive.mockImplementation(() => new Promise(() => {}));
  const callback: WsFrame<EventMessage> = {
    cmd: "aibot_event_callback",
    headers: { req_id: "button-request" },
    body: {
      msgid: "button-msg",
      create_time: 1,
      aibotid: "fake-bot",
      chattype: "group",
      chatid: "group-fake",
      from: { userid: "clicker" },
      msgtype: "event",
      event: {
        eventtype: EventType.TemplateCardEvent,
        event_key: "action:cancel",
        task_id: "card-fake",
      },
    },
  };
  sdk.ws?.emit("event.template_card_event", callback);
  expect(sdk.update).toHaveBeenCalledWith(
    callback,
    expect.objectContaining({ task_id: "card-fake" }),
  );
  await flush();
  expect(receive.mock.lastCall?.[0]).toMatchObject({
    externalUserId: "clicker",
    action: "cancel",
    isGroup: true,
  });
  expect(sdk.update.mock.invocationCallOrder[0]).toBeLessThan(
    receive.mock.invocationCallOrder[0] as number,
  );
});

test("active sends use original single/group chat and correct body", async () => {
  plugin.setup(context());
  await plugin.send("group-fake", { text: "任务完成" });
  expect(sdk.send).toHaveBeenLastCalledWith("group-fake", {
    msgtype: "markdown",
    markdown: { content: "任务完成" },
  });
  await plugin.send("user-fake", { text: "确认", options: [{ id: "confirm", label: "确认" }] });
  expect(sdk.send).toHaveBeenNthCalledWith(2, "user-fake", {
    msgtype: "markdown",
    markdown: { content: "确认" },
  });
  expect(sdk.send).toHaveBeenLastCalledWith("user-fake", {
    msgtype: "template_card",
    template_card: expect.objectContaining({
      button_list: [{ text: "确认", key: "action:confirm" }],
    }),
  });
  sdk.send.mockRejectedValue(new Error("fake-secret"));
  await expect(plugin.send("user-fake", { text: "x" })).rejects.not.toThrow("fake-secret");
});

test("missing config, connection errors and disconnect status remain local and sanitized", () => {
  plugin.setup(context({ botId: "", botSecret: "" }));
  expect(status.mock.lastCall?.[0]).toMatchObject({
    connected: false,
    lastError: expect.stringContaining("连接失败"),
  });
  expect(sdk.connect).not.toHaveBeenCalled();
  plugin.setup(context());
  sdk.ws?.emit("authenticated");
  expect(status).toHaveBeenLastCalledWith({ connected: true });
  sdk.ws?.emit("error", new Error("fake-secret"));
  expect(status.mock.lastCall?.[0].lastError).not.toContain("fake-secret");
  sdk.ws?.emit("disconnected", "fake-secret");
  expect(status.mock.lastCall?.[0].connected).toBe(false);
  plugin.teardown();
  expect(sdk.disconnect).toHaveBeenCalled();
  expect(sdk.ws?.listenerCount("message")).toBe(0);
});
