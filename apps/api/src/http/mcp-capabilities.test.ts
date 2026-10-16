import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { registerAgent } from "../core/agents/agents.ts";
import { listTasks } from "../core/tasks/store.ts";
import { db } from "../db/client.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });

test("MCP normalizes and deduplicates task capabilities and rejects invalid writes", async () => {
  const { apiKey } = registerAgent({
    name: "w79-mcp-capability-publisher",
    kind: "codex",
    host: "w79",
    capabilities: [],
  });
  const client = new Client({ name: "w79-mcp-capabilities", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
      fetch: async (input, init) => app.request(new Request(input, init)),
    }) as Transport,
  );
  const success = await client.callTool({
    name: "idesk_publish_task",
    arguments: {
      title: "w79-mcp-normalized-task",
      capabilities: [" Coding ", "CODING", " Front   End "],
    },
  });
  expect(success.isError).not.toBe(true);
  expect(listTasks({ q: "w79-mcp-normalized-task" })).toEqual([
    expect.objectContaining({ capabilities: ["coding", "front-end"] }),
  ]);
  for (const value of ["", "x".repeat(33), "a,b"]) {
    const rejected = await client.callTool({
      name: "idesk_publish_task",
      arguments: { title: "w79-mcp-invalid-task", capabilities: [value] },
    });
    expect(rejected.isError).toBe(true);
  }
  expect(listTasks({ q: "w79-mcp-invalid-task" })).toEqual([]);
  const tools = await client.listTools();
  expect(
    tools.tools.find((tool) => tool.name === "idesk_publish_task")?.inputSchema.properties,
  ).toHaveProperty("capabilities");
  await client.close();
});
