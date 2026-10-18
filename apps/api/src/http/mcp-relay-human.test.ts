import { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { expect, test } from "vitest";
import { z } from "zod";
import { registerAgent } from "../core/agents/agents.ts";
import { sendRelay } from "../core/relay/relay.ts";
import { app } from "./app.ts";

test("MCP sends to humans and infers replies while rejecting missing recipients", async () => {
  const { agent, apiKey } = registerAgent({
    name: "human MCP",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const parent = sendRelay(
    { to: { kind: "agent", id: agent.id }, kind: "request", subject: "Report" },
    "human",
  );
  const client = new Client({ name: "human inbox", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
      fetch: async (input, init) => app.request(new Request(input, init)),
    }) as Transport,
  );
  try {
    for (const target of [{ to: { kind: "human" } }, { replyTo: parent.id }]) {
      const result = await client.callTool({
        name: "idesk_relay_send",
        arguments: { ...target, kind: "deliverable", subject: "Done" },
      });
      expect(result.isError).not.toBe(true);
      const content = z
        .array(z.object({ type: z.literal("text"), text: z.string() }))
        .parse(result.content);
      const text = content[0] as { text: string };
      expect(relayMessageSchema.parse(JSON.parse(text.text)).to).toEqual({ kind: "human" });
    }
    const invalid = await client.callTool({
      name: "idesk_relay_send",
      arguments: { kind: "note", subject: "Missing" },
    });
    expect(invalid.isError).toBe(true);
    expect(JSON.stringify(invalid.content)).toContain("收件对象不能为空");
  } finally {
    await client.close();
  }
});
