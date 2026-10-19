import { createHash, createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { webhookTestResultSchema } from "@idesk/shared/agent-schemas";
import { expect, test } from "vitest";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { db } from "../db/client.ts";
import { events } from "../db/schema.ts";
import { plugins } from "../plugins/registry.ts";
import { app } from "./app.ts";

function agentRequest(path: string, key: string, method = "GET", body?: object) {
  return app.request(`/api/v1/agents${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function cookie(password = "test") {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
}

test("webhook test sends signed payload once, reports failures and writes no events", async () => {
  let status = 200;
  const received: { body: string; signature: string | undefined }[] = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    received.push({ body, signature: request.headers["x-idesk-signature"] as string });
    response.writeHead(status).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  const { agent, apiKey } = registerAgent({
    name: "webhook test",
    kind: "codex",
    host: "test",
    capabilities: [],
    webhookUrl: `http://127.0.0.1:${port}`,
  });
  const admin = await cookie();
  const eventCount = db.select().from(events).all().length;
  const success = await agentRequest("/me/webhook-test", apiKey, "POST");
  expect(success.status).toBe(200);
  expect(webhookTestResultSchema.parse(await success.json())).toMatchObject({
    ok: true,
    status: 200,
    error: null,
    notifierEnabled: plugins.get("webhook-notifier")?.enabled === true,
  });
  expect(received).toHaveLength(1);
  const first = received[0] as { body: string; signature: string | undefined };
  const payload = JSON.parse(first.body);
  expect(payload).toMatchObject({ type: "webhook.test", taskId: null, agentId: null, payload: {} });
  expect(payload.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  expect(payload.ts).toBeTruthy();
  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
  expect(first.signature).toBe(
    `sha256=${createHmac("sha256", apiKeyHash).update(first.body).digest("hex")}`,
  );

  status = 500;
  const failure = await app.request(`/api/v1/agents/${agent.id}/webhook-test`, {
    method: "POST",
    headers: { Cookie: admin },
  });
  expect(failure.status).toBe(200);
  expect(webhookTestResultSchema.parse(await failure.json())).toMatchObject({
    ok: false,
    status: 500,
    error: "HTTP 500",
  });
  expect(received).toHaveLength(2);
  await new Promise<void>((resolve) => server.close(() => resolve()));

  const networkFailure = await agentRequest("/me/webhook-test", apiKey, "POST");
  expect(networkFailure.status).toBe(200);
  expect(webhookTestResultSchema.parse(await networkFailure.json())).toMatchObject({
    ok: false,
    status: null,
    error: "HTTP request failed",
  });
  expect(db.select().from(events).all()).toHaveLength(eventCount);
});

test("webhook test enforces configured address and route roles", async () => {
  const { agent, apiKey } = registerAgent({
    name: "webhook test roles",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const missingWebhook = await agentRequest("/me/webhook-test", apiKey, "POST");
  expect(missingWebhook.status).toBe(400);
  expect(await missingWebhook.json()).toEqual({ error: "这个智能体没有配置 Webhook" });
  const admin = await cookie();
  const unknown = await app.request("/api/v1/agents/nonexistent/webhook-test", {
    method: "POST",
    headers: { Cookie: admin },
  });
  expect(unknown.status).toBe(404);
  expect((await agentRequest(`/${agent.id}/webhook-test`, apiKey, "POST")).status).toBe(403);

  const previous = config.IDESK_VIEWER_PASSWORD;
  config.IDESK_VIEWER_PASSWORD = "test-viewer";
  try {
    const viewer = await app.request(`/api/v1/agents/${agent.id}/webhook-test`, {
      method: "POST",
      headers: { Cookie: await cookie("test-viewer") },
    });
    expect(viewer.status).toBe(403);
  } finally {
    config.IDESK_VIEWER_PASSWORD = previous;
  }
});
