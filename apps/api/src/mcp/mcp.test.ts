import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { z } from "zod";
import { registerAgent } from "../core/agents/agents.ts";
import { createTask } from "../core/tasks/store.ts";
import { db } from "../db/client.ts";
import { app } from "../http/app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });

async function connect(apiKey: string) {
  const client = new Client({ name: "test", version: "1.0.0" });
  // SDK 的 sessionId getter 含 undefined，与 exactOptionalPropertyTypes 下的 Transport 声明不一致。
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
      fetch: async (input, init) => app.request(new Request(input, init)),
    }) as Transport,
  );
  return client;
}

const textContent = z.object({
  content: z.tuple([z.object({ type: z.literal("text"), text: z.string() })]),
});
const resourceContent = z.object({
  contents: z.tuple([z.object({ text: z.string(), mimeType: z.string() })]),
});

function payload(result: object): string {
  return textContent.parse(result).content[0].text;
}

test("MCP requires an agent key even when a human cookie is present", async () => {
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  for (const headers of [
    {},
    { Cookie: login.headers.get("Set-Cookie") as string },
    { Authorization: "Bearer idk_invalid" },
  ]) {
    const response = await app.request("/mcp", { method: "POST", headers });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authorization" in headers ? "key 无效" : "未登录",
    });
  }
});

test("SDK tools and resources share task transitions and relay read state", async () => {
  const a = registerAgent({ name: "MCP A", kind: "codex", host: "test", capabilities: ["coding"] });
  const b = registerAgent({ name: "MCP B", kind: "codex", host: "test", capabilities: ["coding"] });
  const matching = createTask({ title: "MCP matching", capabilities: ["coding"] }, "human");
  const missingCapability = createTask(
    { title: "MCP GPU", capabilities: ["coding", "gpu"] },
    "human",
  );
  const clientA = await connect(a.apiKey);
  const clientB = await connect(b.apiKey);
  try {
    const names = (await clientA.listTools()).tools.map((tool) => tool.name);
    expect(names.sort()).toEqual(
      [
        "idesk_me",
        "idesk_list_tasks",
        "idesk_get_task",
        "idesk_publish_task",
        "idesk_claim_task",
        "idesk_accept_task",
        "idesk_join_task",
        "idesk_report",
        "idesk_complete_task",
        "idesk_handoff_task",
        "idesk_pause_task",
        "idesk_release_task",
        "idesk_resume_task",
        "idesk_relay_send",
        "idesk_relay_inbox",
      ].sort(),
    );
    expect(names).not.toContain("idesk_take_task");
    expect(JSON.parse(payload(await clientA.callTool({ name: "idesk_me" })))).toMatchObject({
      id: a.agent.id,
      status: "online",
    });
    const open = JSON.parse(payload(await clientA.callTool({ name: "idesk_list_tasks" })));
    expect(open).toContainEqual(expect.objectContaining({ id: matching.id }));
    expect(open).not.toContainEqual(expect.objectContaining({ id: missingCapability.id }));
    const callA = (name: string, extra: object = {}) =>
      clientA.callTool({ name, arguments: { taskId: matching.id, ...extra } });
    expect(JSON.parse(payload(await callA("idesk_claim_task")))).toMatchObject({
      status: "in_progress",
      assigneeId: a.agent.id,
    });
    const repeat = await callA("idesk_claim_task");
    expect(repeat.isError).toBe(true);
    expect(payload(repeat)).toBe("进行中的任务不能领取");
    const absent = await clientA.callTool({
      name: "idesk_get_task",
      arguments: { taskId: "missing" },
    });
    expect(absent.isError).toBe(true);
    expect(payload(absent)).toBe("任务不存在");
    expect((await callA("idesk_report", { message: "实现中" })).isError).not.toBe(true);
    expect(JSON.parse(payload(await callA("idesk_get_task"))).events).toContainEqual(
      expect.objectContaining({ type: "task.reported", payload: { message: "实现中" } }),
    );
    await callA("idesk_pause_task");
    const paused = await callA("idesk_complete_task", { result: "提前完成" });
    expect(paused.isError).toBe(true);
    expect(payload(paused)).toBe("已暂停的任务不能完成");
    await callA("idesk_resume_task");
    const mine = await clientA.callTool({ name: "idesk_list_tasks", arguments: { mine: true } });
    expect(JSON.parse(payload(mine))).toContainEqual(expect.objectContaining({ id: matching.id }));
    await callA("idesk_handoff_task", { to: b.agent.id, note: "交接上下文" });
    for (let i = 0; i < 2; i++) {
      const resource = await clientB.readResource({ uri: "idesk://relay/inbox" });
      expect(JSON.parse(resourceContent.parse(resource).contents[0].text)).toContainEqual(
        expect.objectContaining({ taskId: matching.id, kind: "deliverable" }),
      );
    }
    const inbox = await clientB.callTool({ name: "idesk_relay_inbox" });
    expect(JSON.parse(payload(inbox))).toContainEqual(
      expect.objectContaining({ taskId: matching.id, body: "交接上下文" }),
    );
    expect(JSON.parse(payload(await clientB.callTool({ name: "idesk_relay_inbox" })))).toEqual([]);
    const all = await clientB.callTool({ name: "idesk_relay_inbox", arguments: { all: true } });
    expect(JSON.parse(payload(all))).toContainEqual(
      expect.objectContaining({ taskId: matching.id, readBy: [b.agent.id] }),
    );
    await clientB.callTool({ name: "idesk_accept_task", arguments: { taskId: matching.id } });
    await clientB.callTool({
      name: "idesk_complete_task",
      arguments: { taskId: matching.id, result: "已完成" },
    });
    const resource = await clientB.readResource({ uri: `idesk://task/${matching.id}` });
    expect(JSON.parse(resourceContent.parse(resource).contents[0].text)).toMatchObject({
      status: "done",
      result: "已完成",
      events: expect.any(Array),
    });
    const broadcast = await clientA.callTool({
      name: "idesk_relay_send",
      arguments: { to: { kind: "broadcast" }, kind: "note", subject: "广播", body: "消息" },
    });
    expect(JSON.parse(payload(broadcast))).toMatchObject({ fromAgentId: a.agent.id });
    expect(
      JSON.parse(payload(await clientB.callTool({ name: "idesk_relay_inbox" }))),
    ).toContainEqual(expect.objectContaining({ subject: "广播" }));
    const published = await clientA.callTool({
      name: "idesk_publish_task",
      arguments: { title: "SDK 发布", dueAt: "2030-01-01T00:00:00Z" },
    });
    expect(JSON.parse(payload(published))).toMatchObject({
      publisherId: a.agent.id,
      dueAt: "2030-01-01T00:00:00.000Z",
    });
    const available = await clientA.readResource({ uri: "idesk://tasks/open" });
    expect(resourceContent.parse(available).contents[0].mimeType).toBe("application/json");
    expect(JSON.parse(resourceContent.parse(available).contents[0].text)).not.toContainEqual(
      expect.objectContaining({ id: missingCapability.id }),
    );
  } finally {
    await clientA.close();
    await clientB.close();
  }
});
