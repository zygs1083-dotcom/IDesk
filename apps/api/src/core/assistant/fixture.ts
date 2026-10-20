import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AssistantSettings } from "@idesk/shared/assistant-schemas";
import { afterEach, beforeEach } from "vitest";
import { z } from "zod";
import { db } from "../../db/client.ts";
import {
  agents,
  assistantSettings,
  automationJobs,
  connectors,
  events,
  people,
  pluginState,
  relayMessages,
  schedules,
  serverSamples,
  servers,
  tasks,
} from "../../db/schema.ts";
import { stopPlugins } from "../../plugins/registry.ts";
import { saveSettings } from "./settings.ts";
import type { Json } from "./tool-schemas.ts";

const closers: (() => Promise<void>)[] = [];
beforeEach(() => {
  for (const table of [
    people,
    tasks,
    agents,
    events,
    assistantSettings,
    automationJobs,
    connectors,
    schedules,
    relayMessages,
    serverSamples,
    servers,
    pluginState,
  ])
    db.delete(table).run();
});
afterEach(async () => {
  await stopPlugins();
  for (const close of closers.splice(0)) await close();
});
export type ModelRequest = {
  path: string;
  body: Record<string, Json>;
  headers: IncomingHttpHeaders;
};
export async function fakeModel(
  handler: (request: ModelRequest, turn: number) => Json | Promise<Json>,
  protocol: AssistantSettings["protocol"] = "openai-chat",
  status = 200,
) {
  const requests: ModelRequest[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const recorded = {
      path: request.url ?? "",
      body: z.record(z.string(), z.json()).parse(JSON.parse(Buffer.concat(chunks).toString())),
      headers: request.headers,
    };
    requests.push(recorded);
    const body = await handler(recorded, requests.length);
    response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TCP address required");
  closers.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  saveSettings({
    protocol,
    baseUrl: `http://127.0.0.1:${address.port}`,
    apiKey: "fake-model-key",
    model: "fake-model",
    enabled: true,
  });
  return requests;
}
export function nativeReply(
  protocol: AssistantSettings["protocol"],
  calls: { name: string; input: Json }[] = [],
  text = "查询完成",
): Json {
  return protocol === "openai-chat"
    ? {
        choices: [
          {
            message: {
              content: calls.length ? null : text,
              ...(calls.length
                ? {
                    tool_calls: calls.map((call, i) => ({
                      id: `call-${i}`,
                      type: "function",
                      function: { name: call.name, arguments: JSON.stringify(call.input) },
                    })),
                  }
                : {}),
            },
          },
        ],
      }
    : {
        content: calls.length
          ? calls.map((call, i) => ({
              type: "tool_use",
              id: `call-${i}`,
              name: call.name,
              input: call.input,
            }))
          : [{ type: "text", text }],
      };
}
export function person(role: "member" | "viewer" = "member") {
  return db.insert(people).values({ name: "Assistant fixture", role }).returning().get();
}
