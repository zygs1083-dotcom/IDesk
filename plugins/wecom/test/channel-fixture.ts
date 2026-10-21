import { EventEmitter } from "node:events";
import { Socket } from "node:net";
import type { AssistantReceiveInput } from "@idesk/shared/assistant-schemas";
import type { BaseMessage, WsFrame } from "@wecom/aibot-node-sdk";
import { afterEach, beforeEach, vi } from "vitest";
import type { PluginContext } from "../../../apps/api/src/plugins/types.ts";

const sdk = vi.hoisted(() => ({
  ws: null as EventEmitter | null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  stream: vi.fn(),
  card: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@wecom/aibot-node-sdk", async (original) => ({
  ...(await original<typeof import("@wecom/aibot-node-sdk")>()),
  WSClient: class extends EventEmitter {
    constructor() {
      super();
      sdk.ws = this;
    }
    isConnected = true;
    connect = sdk.connect;
    disconnect = sdk.disconnect;
    sendMessage = sdk.send;
    replyStream = sdk.stream;
    replyTemplateCard = sdk.card;
    updateTemplateCard = sdk.update;
  },
}));
const { default: plugin } = await import("../index.ts");
const receive = vi.fn<(input: AssistantReceiveInput) => Promise<void>>();
const status = vi.fn();
const context = (config = { botId: "fake-bot", botSecret: "fake-secret" }) =>
  ({
    config: plugin.configSchema.parse(config),
    assistant: { receive, status },
    db: {} as PluginContext["db"],
    dataDir: "/tmp/w116-fake",
    publicUrl: undefined,
    tasks: { act: vi.fn<PluginContext["tasks"]["act"]>() },
    schedule: vi.fn<PluginContext["schedule"]>(),
    registerRoutes: vi.fn<PluginContext["registerRoutes"]>(),
    events: { emit: vi.fn(), on: vi.fn<PluginContext["events"]["on"]>() },
  }) satisfies PluginContext;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
function frame(overrides: Partial<BaseMessage> = {}): WsFrame<BaseMessage> {
  return {
    cmd: "aibot_msg_callback",
    headers: { req_id: "fake-request" },
    body: {
      msgid: "msg-fake",
      aibotid: "fake-bot",
      chattype: "single",
      from: { userid: "user-fake" },
      msgtype: "text",
      text: { content: "绑定 abc123" },
      ...overrides,
    },
  };
}
beforeEach(() => {
  vi.spyOn(Socket.prototype, "connect").mockImplementation(() => {
    throw new Error("Channel tests disable network connections");
  });
  vi.clearAllMocks();
  receive.mockReset().mockResolvedValue();
  sdk.connect.mockReset();
  sdk.send.mockReset().mockResolvedValue({ errcode: 0 });
  sdk.stream.mockReset().mockResolvedValue({ errcode: 0 });
  sdk.card.mockReset().mockResolvedValue({ errcode: 0 });
  sdk.update.mockReset().mockResolvedValue({ errcode: 0 });
});
afterEach(() => {
  plugin.teardown();
  vi.restoreAllMocks();
});

export { context, flush, frame, plugin, receive, sdk, status };
