import { sendRelaySchema } from "@idesk/shared/relay-schemas";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PublicAgent } from "../../core/agents/agents.ts";
import { listRelay, markRelayRead, sendRelay } from "../../core/relay/relay.ts";
import { toolResult } from "../result.ts";

export function registerRelayTools(server: McpServer, agent: PublicAgent) {
  const actor = { kind: "agent" as const, id: agent.id, capabilities: agent.capabilities };
  server.registerTool(
    "idesk_relay_send",
    { description: "向指定智能体、某种能力或全体发送消息。", inputSchema: sendRelaySchema.shape },
    (input) => toolResult(sendRelay(input, agent.id)),
  );
  server.registerTool(
    "idesk_relay_inbox",
    {
      description: "读取并标记收件箱消息为已读，默认只看未读，all 查看全部。",
      inputSchema: { all: z.boolean().optional() },
    },
    ({ all }) => {
      const messages = listRelay(actor, "inbox").filter(
        (message) => all || !message.readBy.includes(agent.id),
      );
      for (const message of messages) markRelayRead(message.id, actor);
      return toolResult(messages);
    },
  );
}
