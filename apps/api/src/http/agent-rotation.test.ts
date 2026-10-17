import { createHash } from "node:crypto";
import { publicAgentSchema, registeredAgentSchema } from "@idesk/shared/agent-schemas";
import { taskSchema } from "@idesk/shared/task-schemas";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { db } from "../db/client.ts";
import { agents, events } from "../db/schema.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
async function cookie(password: string) {
  const result = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return (result.headers.get("Set-Cookie") as string).split(";")[0] as string;
}
function transport(key: string) {
  return new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
    fetch: async (input, init) => app.request(new Request(input, init)),
  }) as Transport;
}

test("rotation preserves identity and history, revokes REST and existing MCP access, and keeps secrets out of reads/events", async () => {
  const { agent, apiKey } = registerAgent({
    name: "rotate",
    kind: "codex",
    host: "test",
    capabilities: [],
    webhookUrl: "https://example.com/hook",
  });
  const old = new Client({ name: "rotation", version: "1" });
  await old.connect(transport(apiKey));
  const task = taskSchema.parse(
    await (
      await app.request("/api/v1/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: "rotation history" }),
      })
    ).json(),
  );
  const history = db.select().from(events).where(eq(events.agentId, agent.id)).all();
  const before = db.select().from(agents).where(eq(agents.id, agent.id)).get();
  const path = `/api/v1/agents/${agent.id}/rotate-key`;
  const admin = await cookie("test");
  expect(
    (await app.request(path, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` } }))
      .status,
  ).toBe(403);
  const previous = config.IDESK_VIEWER_PASSWORD;
  config.IDESK_VIEWER_PASSWORD = "rotation-viewer";
  try {
    expect(
      (
        await app.request(path, {
          method: "POST",
          headers: { Cookie: await cookie("rotation-viewer") },
        })
      ).status,
    ).toBe(403);
  } finally {
    config.IDESK_VIEWER_PASSWORD = previous;
  }
  const response = await app.request(path, { method: "POST", headers: { Cookie: admin } });
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const raw = await response.json();
  const result = registeredAgentSchema.parse(raw);
  expect(Object.keys(raw).sort()).toEqual(["agent", "apiKey"]);
  expect(raw.agent).not.toHaveProperty("apiKeyHash");
  expect(result.apiKey).toMatch(/^idk_[A-Za-z0-9_-]{43}$/);
  expect(result.apiKey).not.toBe(apiKey);
  expect(result.agent).toEqual({
    ...agent,
    createdAt: agent.createdAt.toISOString(),
    lastSeenAt: null,
    status: "offline",
  });
  const after = db.select().from(agents).where(eq(agents.id, agent.id)).get();
  expect(after).toEqual({
    ...before,
    lastSeenAt: null,
    apiKeyHash: createHash("sha256").update(result.apiKey).digest("hex"),
  });
  const recorded = db.select().from(events).where(eq(events.agentId, agent.id)).all();
  expect(recorded.slice(0, -1)).toEqual(history);
  expect(recorded.at(-1)).toMatchObject({
    type: "agent.key_rotated",
    agentId: agent.id,
    payload: { name: agent.name, kind: agent.kind },
  });
  for (const [key, status] of [
    [apiKey, 401],
    [result.apiKey, 200],
  ] as const) {
    const me = await app.request("/api/v1/agents/me", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(me.status).toBe(status);
    if (status === 200) expect(publicAgentSchema.parse(await me.json()).id).toBe(agent.id);
  }
  const preserved = await app.request(`/api/v1/tasks/${task.id}`, { headers: { Cookie: admin } });
  expect(taskSchema.parse(await preserved.json())).toEqual(task);
  await expect(old.listTools()).rejects.toMatchObject({ code: 401 });
  await old.close();
  const fresh = new Client({ name: "rotated", version: "1" });
  await fresh.connect(transport(result.apiKey));
  expect((await fresh.listTools()).tools.length).toBeGreaterThan(0);
  await fresh.close();
  const listing = await (
    await app.request("/api/v1/agents", { headers: { Cookie: admin } })
  ).text();
  for (const secret of [apiKey, result.apiKey, after?.apiKeyHash]) {
    expect(listing).not.toContain(secret);
    expect(JSON.stringify(recorded)).not.toContain(secret);
  }
  expect(
    (
      await app.request("/api/v1/agents/missing/rotate-key", {
        method: "POST",
        headers: { Cookie: admin },
      })
    ).status,
  ).toBe(404);
});
