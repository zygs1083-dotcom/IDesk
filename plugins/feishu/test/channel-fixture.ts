import { Socket } from "node:net";
import type { AssistantReceiveInput } from "@idesk/shared/assistant-schemas";
import type { EventDispatcher, EventHandles, WSClient } from "@larksuiteoapi/node-sdk";
import { afterEach, beforeEach, vi } from "vitest";
import type { PluginContext } from "../../../apps/api/src/plugins/types.ts";

type Options = ConstructorParameters<typeof WSClient>[0];
const sdk = vi.hoisted(() => ({
  request: vi.fn(),
  create: vi.fn(),
  getChat: vi.fn(),
  close: vi.fn(),
  options: null as Options | null,
  dispatcher: null as EventDispatcher | null,
}));
vi.mock("@larksuiteoapi/node-sdk", async (original) => ({
  ...(await original<typeof import("@larksuiteoapi/node-sdk")>()),
  Client: class {
    request = sdk.request;
    im = { v1: { message: { create: sdk.create }, chat: { get: sdk.getChat } } };
  },
  WSClient: class {
    constructor(options: Options) {
      sdk.options = options;
    }
    async start({ eventDispatcher }: { eventDispatcher: EventDispatcher }) {
      sdk.dispatcher = eventDispatcher;
      sdk.options?.onReady?.();
    }
    close = sdk.close;
    getConnectionStatus() {
      return { state: "connected" };
    }
  },
}));
const { default: plugin } = await import("../index.ts");
const receive = vi.fn<(input: AssistantReceiveInput) => Promise<void>>();
const status = vi.fn();
const config = { appId: "fake-app", appSecret: "fake-secret" };
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
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
let sequence = 0;
function event(type: string, data: object) {
  return sdk.dispatcher?.invoke(
    { schema: "2.0", header: { event_id: `event-${sequence++}`, event_type: type }, event: data },
    { needCheck: false },
  );
}
function message(
  overrides: Partial<
    Parameters<NonNullable<EventHandles["im.message.receive_v1"]>>[0]["message"]
  > = {},
) {
  return {
    sender: { sender_id: { open_id: "ou_sender" }, sender_type: "user" },
    message: {
      message_id: "om_fake",
      create_time: "1000",
      chat_id: "oc_fake",
      chat_type: "p2p",
      message_type: "text",
      content: JSON.stringify({ text: "绑定 abc123" }),
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
  sdk.request.mockReset().mockResolvedValue({ code: 0, bot: { open_id: "ou_bot" } });
  sdk.create.mockReset().mockResolvedValue({ code: 0 });
  sdk.getChat.mockReset().mockResolvedValue({ code: 0, data: { chat_mode: "group" } });
  sdk.dispatcher = null;
});
afterEach(() => {
  plugin.teardown();
  vi.restoreAllMocks();
});

export { context, event, flush, message, plugin, receive, sdk, status };
