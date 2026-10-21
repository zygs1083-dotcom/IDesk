import type { AssistantConnectionStatus } from "@idesk/shared/assistant-schemas";
import { DWClient, type DWClientDownStream } from "dingtalk-stream";

export class DingTalkStream extends DWClient {
  constructor(
    config: { clientId: string; clientSecret: string },
    private readonly status: (value: AssistantConnectionStatus) => void,
  ) {
    super({ ...config, keepAlive: true, debug: false });
  }

  override async getEndpoint(): Promise<this> {
    this.status({ connected: false, lastError: "正在连接钉钉" });
    try {
      return await super.getEndpoint();
    } catch {
      this.status({ connected: false, lastError: "连接失败：请检查钉钉凭据与网络" });
      throw new Error("钉钉连接认证失败");
    }
  }

  override async _connect(): Promise<void> {
    try {
      await super._connect();
      this.status({ connected: true });
    } catch {
      this.status({ connected: false, lastError: "连接失败：钉钉 WebSocket 不可用" });
      throw new Error("钉钉 WebSocket 连接失败");
    }
  }

  // 固定 SDK 2.1.6-beta.1 的公开调试标记是其唯一断线通知入口。
  override printDebug(message: object | string): void {
    if (message === "Socket closed" || message === "SOCKET ERROR") {
      this.status({
        connected: false,
        lastError: message === "Socket closed" ? "钉钉连接断开" : "钉钉连接错误",
      });
    }
    super.printDebug(message);
  }

  override onSystem(message: DWClientDownStream): void {
    super.onSystem(message);
    if (message.headers.topic === "disconnect") {
      this.status({ connected: false, lastError: "连接断开" });
    }
  }
}
