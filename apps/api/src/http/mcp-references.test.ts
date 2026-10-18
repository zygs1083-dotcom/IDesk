import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { expect, test } from "vitest";
import { agentActor, registerAgent } from "../core/agents/agents.ts";
import { sendRelay } from "../core/relay/relay.ts";
import { createTask, getTask, listTasks } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { app } from "./app.ts";

function agent() {
  return registerAgent({ name: "references", kind: "codex", host: "test", capabilities: [] });
}

test("MCP uses the same target and reply validation and cannot recover assigned tasks", async () => {
  const owner = agent();
  const other = agent();
  const task = createTask({ title: "MCP reference boundaries" }, owner.agent.id);
  const actor = agentActor(owner.agent);
  actOnTask(task.id, { type: "claim" }, actor);
  const parent = sendRelay(
    { to: { kind: "agent", id: other.agent.id }, kind: "note", subject: "private" },
    "human",
  );
  const client = new Client({ name: "references", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
      requestInit: { headers: { Authorization: `Bearer ${owner.apiKey}` } },
      fetch: async (input, init) => app.request(new Request(input, init)),
    }) as Transport,
  );
  try {
    const missing = await client.callTool({
      name: "idesk_handoff_task",
      arguments: { taskId: task.id, to: "missing", note: "context" },
    });
    expect(missing.isError).toBe(true);
    expect(missing.content).toEqual([{ type: "text", text: "智能体不存在" }]);
    expect(getTask(task.id)?.status).toBe("in_progress");
    for (const references of [
      { replyTo: "missing" },
      { replyTo: parent.id },
      { taskId: "missing" },
      { to: { kind: "agent", id: "missing" } },
    ]) {
      const result = await client.callTool({
        name: "idesk_relay_send",
        arguments: { to: { kind: "broadcast" }, kind: "reply", subject: "invalid", ...references },
      });
      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: "text",
          text:
            "taskId" in references
              ? "任务不存在"
              : "to" in references
                ? "智能体不存在"
                : "消息不存在",
        },
      ]);
    }
    actOnTask(task.id, { type: "handoff", to: owner.agent.id, note: "self" }, actor);
    const release = await client.callTool({
      name: "idesk_release_task",
      arguments: { taskId: task.id },
    });
    expect(release.isError).toBe(true);
    expect(getTask(task.id)?.status).toBe("assigned");
    const published = await client.callTool({
      name: "idesk_publish_task",
      arguments: { title: "MCP missing target", dispatch: { type: "assign", agentId: "missing" } },
    });
    expect(published.isError).toBe(true);
    expect(listTasks({ q: "MCP missing target" })).toEqual([
      expect.objectContaining({ status: "open" }),
    ]);
  } finally {
    await client.close();
  }
});
