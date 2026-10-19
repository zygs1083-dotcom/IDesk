import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Event, EventState, Receiver } from "./receiver.js";

export function signature(key: string, body: Buffer): string {
  const digest = createHash("sha256").update(key).digest("hex");
  return `sha256=${createHmac("sha256", digest).update(body).digest("hex")}`;
}

export async function handleWebhook(
  receiver: Receiver,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.url !== new URL(receiver.config.publicUrl).pathname) {
    res.writeHead(404).end();
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405).end();
    return;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 1024 * 1024) {
      res.writeHead(413).end();
      return;
    }
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks);
  const actual = req.headers["x-idesk-signature"];
  const expected = signature(receiver.credentials.key, body);
  if (
    typeof actual !== "string" ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  ) {
    res.writeHead(401).end();
    return;
  }
  let event: Event;
  try {
    event = JSON.parse(body.toString("utf8")) as Event;
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (
    !Number.isFinite(Date.parse(event.ts)) ||
    Math.abs(receiver.now() - Date.parse(event.ts)) > 600_000
  ) {
    res.writeHead(422).end();
    return;
  }
  if (receiver.state.events.some((entry) => entry.id === event.id)) {
    res.writeHead(200).end();
    return;
  }
  const entry: EventState = {
    id: event.id,
    type: event.type,
    taskId: event.taskId,
    state: "received",
    at: new Date(receiver.now()).toISOString(),
  };
  receiver.state.events.push(entry);
  receiver.state.events = receiver.state.events.slice(-1000);
  await receiver.save();
  res.writeHead(200).end();
  receiver.log(`事件 ${event.id} ${event.type} received`);
  const processing = receiver
    .process(event, entry)
    .catch(async (error: Error) => {
      entry.state = "failed";
      await receiver.save();
      receiver.log(`事件 ${event.id} ${event.type} failed ${error.message}`);
    })
    .finally(() => receiver.processing.delete(processing));
  receiver.processing.add(processing);
}
