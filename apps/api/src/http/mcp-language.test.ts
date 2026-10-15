import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { registerAgent } from "../core/agents/agents.ts";
import { createTask } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { db } from "../db/client.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });

test("MCP tool errors stay Chinese with an English HTTP header", async () => {
  const { agent, apiKey } = registerAgent({
    name: "English MCP",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const task = createTask({ title: "MCP language" }, "human");
  const actor = { kind: "agent" as const, id: agent.id, capabilities: [] };
  actOnTask(task.id, { type: "claim" }, actor);
  actOnTask(task.id, { type: "complete", result: "done" }, actor);
  const client = new Client({ name: "language", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}`, "Accept-Language": "en" } },
      fetch: async (input, init) => app.request(new Request(input, init)),
    }) as Transport,
  );
  const result = await client.callTool({
    name: "idesk_claim_task",
    arguments: { taskId: task.id },
  });
  await client.close();
  expect(result.isError).toBe(true);
  expect(result.content).toEqual([{ type: "text", text: "已完成的任务不能领取" }]);
});
