import { createServer } from "node:http";
import { readConfig } from "./config.js";
import { Receiver, readReceiverConfig } from "./receiver.js";
import { handleWebhook } from "./receiver-http.js";
import {
  receiverHeartbeat,
  recoverAssignments,
  recoverUnread,
  renewTasks,
} from "./receiver-jobs.js";

export async function runReceiver(): Promise<void> {
  const credentials = await readConfig();
  if (!credentials.key) throw new Error("config.json 缺少 key，先运行 idesk login");
  const config = await readReceiverConfig();
  const receiver = await Receiver.create(config, credentials);
  const url = new URL(config.publicUrl);
  const [host, portText] = config.listen.split(":");
  const server = createServer((req, res) => {
    void handleWebhook(receiver, req, res).catch((error: Error) => {
      receiver.log(`请求失败 ${error.message}`);
      if (!res.headersSent) res.writeHead(500).end();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(portText), host, resolve);
  });
  receiver.log(`接收器监听 ${config.listen}${url.pathname}`);
  const periodic = (name: string, job: () => Promise<void>, interval: number) => {
    void job().catch((error: Error) => receiver.log(`${name}失败 ${error.message}`));
    setInterval(() => {
      void job().catch((error: Error) => receiver.log(`${name}失败 ${error.message}`));
    }, interval);
  };
  periodic("在线心跳", () => receiverHeartbeat(receiver), 60_000);
  periodic("续租", () => renewTasks(receiver), 300_000);
  periodic("指派补漏", () => recoverAssignments(receiver), 600_000);
  void recoverUnread(receiver).catch((error: Error) =>
    receiver.log(`未读补漏失败 ${error.message}`),
  );
}
