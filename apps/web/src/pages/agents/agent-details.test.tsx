import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { Agent } from "../../lib/types.ts";
import { AgentDetails, formatAgentClient } from "./agent-details.tsx";

const view = vi.hoisted(() => ({
  isAdmin: true,
  mutation: {
    data: null as Record<string, unknown> | null,
    error: null as Error | null,
    isPending: false,
  },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useMutation: () => ({ ...view.mutation, mutate: vi.fn(), reset: vi.fn() }),
}));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "zh", t: translator("zh") }) };
});
vi.mock("../../lib/use-session.ts", () => ({ useSession: () => ({ isAdmin: view.isAdmin }) }));
vi.mock("../../lib/use-agents.ts", () => ({ useAgents: () => ({ agentName: vi.fn() }) }));

const agent: Agent = {
  id: "agent",
  name: "Agent",
  kind: "codex",
  host: "host",
  capabilities: [],
  webhookUrl: "••••••",
  client: "idesk-receiver/0.2.0 (darwin; wake=codex)",
  lastSeenAt: null,
  createdAt: "2026-10-18T00:00:00Z",
  status: "online",
};

function render(changes: Partial<Agent> = {}) {
  const client = new QueryClient();
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AgentDetails agent={{ ...agent, ...changes }} />
    </QueryClientProvider>,
  );
  client.clear();
  return html;
}

test("client labels distinguish the official receiver and other clients", () => {
  expect(formatAgentClient("idesk-receiver/0.2.0 (darwin; wake=codex)", "zh")).toBe(
    "官方接收器 0.2.0 · codex",
  );
  expect(formatAgentClient("idesk-receiver/0.2.0 (linux; wake=command)", "zh")).toBe(
    "官方接收器 0.2.0 · 自定义命令",
  );
  expect(formatAgentClient("mac-bridge/1", "zh")).toBe("mac-bridge/1");
  expect(formatAgentClient(null, "zh")).toBe("未上报（不是官方接收器，或版本过旧）");
});

test("receiver row hides push controls without a Webhook or for viewers", () => {
  view.mutation = { data: null, error: null, isPending: false };
  view.isAdmin = true;
  expect(render({ webhookUrl: null })).toContain("未配置 Webhook，被指派时不会被唤醒");
  expect(render({ webhookUrl: null })).not.toContain("测试推送");
  view.isAdmin = false;
  expect(render()).toContain("官方接收器 0.2.0 · codex");
  expect(render()).not.toContain("测试推送");
  view.isAdmin = true;
});

test("push result shows success and disabled notifier status", () => {
  view.mutation = {
    data: { ok: true, status: 200, durationMs: 85, error: null, notifierEnabled: false },
    error: null,
    isPending: false,
  };
  const html = render();
  expect(html).toMatch(/text-status-done[^>]*>接收端响应 200 · 85 ms/);
  expect(html).toMatch(/text-status-paused[^>]*>Webhook 推送插件已停用，真实事件不会推送/);
  expect(html).toContain("测试推送");
});

test("disabled notifier warning also appears after a failed push", () => {
  view.mutation = {
    data: { ok: false, status: 401, durationMs: 85, error: "HTTP 401", notifierEnabled: false },
    error: null,
    isPending: false,
  };
  const html = render();
  expect(html).toMatch(/text-status-failed[^>]*>失败：HTTP 401/);
  expect(html).toMatch(/text-status-paused[^>]*>Webhook 推送插件已停用，真实事件不会推送/);
});

test.each([
  ["HTTP 401", "失败：HTTP 401"],
  ["Request timed out", "失败：超时"],
  ["HTTP request failed", "失败：连接不上"],
])("push failure %s has the failed color", (error, expected) => {
  view.mutation = {
    data: { ok: false, status: null, durationMs: 85, error, notifierEnabled: true },
    error: null,
    isPending: false,
  };
  expect(render()).toMatch(new RegExp(`text-status-failed[^>]*>${expected}`));
});

test("request failure and pending state are visible", () => {
  view.mutation = { data: null, error: new Error("Network offline"), isPending: false };
  expect(render()).toMatch(/text-status-failed[^>]*>失败：Network offline/);
  view.mutation = { data: null, error: null, isPending: true };
  expect(render()).toContain("推送中…");
});
