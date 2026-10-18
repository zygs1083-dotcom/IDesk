import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { expect, test } from "vitest";
import { registerAgent } from "../core/agents/agents.ts";
import { createTask, listTasks } from "../core/tasks/store.ts";
import { app } from "./app.ts";

test("MCP publishes with dispatch and reports rejected dispatch in Chinese", async () => {
  const { agent, apiKey } = registerAgent({
    name: "publisher",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const client = new Client({ name: "publish", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}`, "Accept-Language": "en" } },
      fetch: async (input, init) => app.request(new Request(input, init)),
    }) as Transport,
  );
  const success = await client.callTool({
    name: "idesk_publish_task",
    arguments: { title: "MCP assigned", dispatch: { type: "assign", agentId: agent.id } },
  });
  expect(success.isError).not.toBe(true);
  expect(listTasks({ q: "MCP assigned" })).toEqual([
    expect.objectContaining({ status: "assigned", assigneeId: agent.id }),
  ]);
  const blocker = createTask({ title: "前置任务" }, "human");
  const rejected = await client.callTool({
    name: "idesk_publish_task",
    arguments: {
      title: "MCP publish blocked",
      blockedBy: [blocker.id],
      dispatch: { type: "recruit", needed: 2 },
    },
  });
  await client.close();
  expect(rejected.isError).toBe(true);
  expect(rejected.content).toEqual([{ type: "text", text: "被「前置任务」阻塞" }]);
  expect(listTasks({ q: "MCP publish blocked" })).toEqual([
    expect.objectContaining({ status: "open" }),
  ]);
});
