import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicAgentSchema } from "@idesk/shared/agent-schemas";
import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { db } from "../db/client.ts";
import { agents } from "../db/schema.ts";
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

test("public guide substitutes request origin and serves the CLI file", async () => {
  const guide = await app.request("http://localhost/agent-guide.md");
  expect(guide.status).toBe(200);
  expect(guide.headers.get("Content-Type")).toContain("text/markdown");
  expect(guide.headers.get("Cache-Control")).toBe("no-cache");
  const markdown = await guide.text();
  expect(markdown).not.toContain("{{origin}}");
  expect(markdown).toContain("http://localhost/api/agent-kit/v1/idesk.mjs");

  const directory = mkdtempSync(join(tmpdir(), "idesk-cli-test-"));
  const previous = config.IDESK_CLI_DIST;
  try {
    const file = join(directory, "idesk.mjs");
    writeFileSync(file, "export const version = 'test';\n");
    config.IDESK_CLI_DIST = file;
    const response = await app.request("/api/agent-kit/v1/idesk.mjs");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/javascript");
    expect(await response.text()).toBe("export const version = 'test';\n");
  } finally {
    config.IDESK_CLI_DIST = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("heartbeat reports client without clearing it on empty requests", async () => {
  const { agent, apiKey } = registerAgent({
    name: "heartbeat client",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  expect(agent.client).toBeNull();
  const bare = await agentRequest("/me/heartbeat", apiKey, "POST");
  expect(bare.status).toBe(200);
  expect(publicAgentSchema.parse(await bare.json()).client).toBeNull();
  const client = "idesk-receiver/0.2.0 (linux; wake=codex)";
  const updated = await agentRequest("/me/heartbeat", apiKey, "POST", { client });
  expect(updated.status).toBe(200);
  expect(publicAgentSchema.parse(await updated.json()).client).toBe(client);
  expect(publicAgentSchema.parse(await (await agentRequest("/me", apiKey)).json()).client).toBe(
    client,
  );
  const listed = await app.request("/api/v1/agents", { headers: { Cookie: await cookie() } });
  expect((await listed.json()).find((item: { id: string }) => item.id === agent.id)).toMatchObject({
    client,
  });
  expect(
    publicAgentSchema.parse(await (await agentRequest("/me/heartbeat", apiKey, "POST")).json())
      .client,
  ).toBe(client);
  expect(
    publicAgentSchema.parse(await (await agentRequest("/me/heartbeat", apiKey, "POST", {})).json())
      .client,
  ).toBe(client);
  expect(
    (await agentRequest("/me/heartbeat", apiKey, "POST", { client: "x".repeat(121) })).status,
  ).toBe(400);
  expect((await agentRequest("/me/heartbeat", apiKey, "POST", { client: "" })).status).toBe(400);
});

test("agent PATCH me stores real webhook address and masks reads", async () => {
  const { agent, apiKey } = registerAgent({
    name: "webhook self registration",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const url = "https://example.com/agent-hook";
  const response = await agentRequest("/me", apiKey, "PATCH", { webhookUrl: url });
  expect(response.status).toBe(200);
  expect(publicAgentSchema.parse(await response.json()).webhookUrl).toBe("••••••");
  expect(db.select().from(agents).where(eq(agents.id, agent.id)).get()?.webhookUrl).toBe(url);
  const listed = await app.request("/api/v1/agents", { headers: { Cookie: await cookie() } });
  expect((await listed.json()).find((item: { id: string }) => item.id === agent.id)).toMatchObject({
    webhookUrl: "••••••",
  });
  const cleared = await agentRequest("/me", apiKey, "PATCH", { webhookUrl: null });
  expect(cleared.status).toBe(200);
  expect(publicAgentSchema.parse(await cleared.json()).webhookUrl).toBeNull();
  expect(db.select().from(agents).where(eq(agents.id, agent.id)).get()?.webhookUrl).toBeNull();
  expect((await agentRequest("/me", apiKey, "PATCH", { webhookUrl: "invalid" })).status).toBe(400);
  const human = await app.request("/api/v1/agents/me", {
    method: "PATCH",
    headers: { Cookie: await cookie(), "Content-Type": "application/json" },
    body: JSON.stringify({ webhookUrl: url }),
  });
  expect(human.status).toBe(403);
  expect(await human.json()).toEqual({ error: "只有智能体可以操作" });
});
