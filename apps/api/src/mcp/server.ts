import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { agentActor, type PublicAgent } from "../core/agents/agents.ts";
import { listRelay } from "../core/relay/relay.ts";
import { registerActionTools } from "./tools/actions.ts";
import { registerRelayTools } from "./tools/relay.ts";
import { claimableTasks, registerTaskTools, taskWithEvents } from "./tools/tasks.ts";

export function createMcpServer(agent: PublicAgent): McpServer {
  const server = new McpServer({ name: "idesk", version: "0.1.0" });
  registerTaskTools(server, agent);
  registerActionTools(server, agent);
  registerRelayTools(server, agent);
  const metadata = { mimeType: "application/json" };
  server.registerResource("open_tasks", "idesk://tasks/open", metadata, (uri) => ({
    contents: [{ uri: uri.href, ...metadata, text: JSON.stringify(claimableTasks(agent)) }],
  }));
  server.registerResource(
    "task",
    new ResourceTemplate("idesk://task/{id}", { list: undefined }),
    metadata,
    (uri, { id }) => {
      const task = taskWithEvents(id as string);
      if (!task) throw new McpError(ErrorCode.InvalidParams, "任务不存在");
      return { contents: [{ uri: uri.href, ...metadata, text: JSON.stringify(task) }] };
    },
  );
  server.registerResource("relay_inbox", "idesk://relay/inbox", metadata, (uri) => {
    const messages = listRelay(agentActor(agent), "inbox").filter(
      (message) => !message.readBy.includes(agent.id),
    );
    return { contents: [{ uri: uri.href, ...metadata, text: JSON.stringify(messages) }] };
  });
  return server;
}
