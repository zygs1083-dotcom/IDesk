import { Socket } from "node:net";
import type { AssistantReceiveInput } from "@idesk/shared/assistant-schemas";
import {
  DWClient,
  type DWClientDownStream,
  type RobotTextMessage,
  TOPIC_ROBOT,
} from "dingtalk-stream";
import { afterEach, beforeEach, type MockInstance, vi } from "vitest";
import type { PluginContext } from "../../../apps/api/src/plugins/types.ts";
import plugin from "../index.ts";

const receive = vi.fn<(input: AssistantReceiveInput) => Promise<void>>();
const status = vi.fn();
const config = { clientKey: "fake-key", clientSecret: "fake-secret", robotCode: "fake-robot" };
const context = (value = config) =>
  ({
    config: plugin.configSchema.parse(value),
    assistant: { receive, status },
    db: {} as PluginContext["db"],
    dataDir: "/tmp/w116-fake",
    publicUrl: undefined,
    tasks: { act: vi.fn<PluginContext["tasks"]["act"]>() },
    schedule: vi.fn<PluginContext["schedule"]>(),
    registerRoutes: vi.fn<PluginContext["registerRoutes"]>(),
    events: { emit: vi.fn(), on: vi.fn<PluginContext["events"]["on"]>() },
  }) satisfies PluginContext;
const http = vi.fn<typeof fetch>();
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const base: RobotTextMessage = {
  conversationId: "cid-fake",
  chatbotCorpId: "corp-fake",
  chatbotUserId: "bot-fake",
  msgId: "msg-fake",
  senderNick: "测试员工",
  isAdmin: false,
  senderStaffId: "staff-fake",
  sessionWebhookExpiredTime: 1000000,
  createAt: 1,
  senderCorpId: "corp-fake",
  conversationType: "1",
  senderId: "ding-fake",
  sessionWebhook: "https://oapi.dingtalk.com/robot/sendBySession?session=FAKE",
  robotCode: "fake-robot",
  msgtype: "text",
  text: { content: "绑定 abc123" },
};
function downstream(overrides: object = {}): DWClientDownStream {
  return {
    specVersion: "1.0",
    type: "CALLBACK",
    headers: {
      appId: "fake-key",
      connectionId: "fake-connection",
      contentType: "application/json",
      messageId: "ack-fake",
      time: "1000",
      topic: TOPIC_ROBOT,
    },
    data: JSON.stringify({ ...base, ...overrides }),
  };
}
let connect: MockInstance<DWClient["connect"]>;
let endpoint: MockInstance<DWClient["getEndpoint"]>;
let acknowledge: MockInstance<DWClient["socketCallBackResponse"]>;
let client: DWClient | undefined;
function deliver(frame = downstream()) {
  client?.onDownStream(JSON.stringify(frame));
}
beforeEach(() => {
  vi.spyOn(Socket.prototype, "connect").mockImplementation(() => {
    throw new Error("Channel tests disable network connections");
  });
  receive.mockReset().mockResolvedValue();
  status.mockReset();
  http.mockReset().mockImplementation(async () => Response.json({ errcode: 0 }));
  vi.stubGlobal("fetch", http);
  endpoint = vi.spyOn(DWClient.prototype, "getEndpoint").mockImplementation(async function (
    this: DWClient,
  ) {
    client = this;
    return this;
  });
  vi.spyOn(DWClient.prototype, "_connect").mockImplementation(async function (this: DWClient) {
    this.connected = true;
  });
  vi.spyOn(DWClient.prototype, "getAccessToken").mockResolvedValue("fake-token");
  acknowledge = vi.spyOn(DWClient.prototype, "socketCallBackResponse");
  connect = vi.spyOn(DWClient.prototype, "connect");
});
afterEach(() => {
  plugin.teardown();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

export {
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
};
