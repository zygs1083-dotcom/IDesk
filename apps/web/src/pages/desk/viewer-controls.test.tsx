import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type { Task } from "../../lib/types.ts";
import { AutomationPage } from "../automation/automation-page.tsx";
import { RelayMessage } from "../relay/relay-message.tsx";
import { AppearancePage } from "../settings/appearance-page.tsx";
import { ConnectorRow } from "../settings/connector-row.tsx";
import { DraggableCard } from "./draggable-card.tsx";
import { TaskDrawer } from "./task-drawer.tsx";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }), currentLang: () => "en" };
});
afterEach(() => vi.unstubAllGlobals());
const task: Task = {
  id: "task",
  title: "Readable task",
  body: "Readable body",
  status: "in_progress",
  priority: "normal",
  tags: [],
  capabilities: [],
  blockedBy: ["dependency"],
  publisherId: "human",
  assigneeId: "agent",
  recruit: null,
  leaseExpiresAt: "2030-01-01T00:00:00Z",
  result: null,
  dueAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  completedAt: null,
};
const connector = {
  id: "connector",
  name: "Readable connector",
  pluginId: "plugin",
  pollIntervalSec: 60,
  canTrigger: false,
  enabled: true,
  config: {},
  lastError: null,
  lastPolledAt: null,
  lastSucceededAt: null,
  progress: null,
};

test.each([undefined, "viewer", "admin"] as const)(
  "%s sees readable content and only admins get task, relay and connector writes",
  (role) => {
    const client = new QueryClient();
    if (role) client.setQueryData(["auth", "me"], { role });
    client.setQueryData(["task", task.id], task);
    client.setQueryData(["task", task.id, "events"], []);
    client.setQueryData(
      ["tasks"],
      [task, { ...task, id: "dependency", title: "Dependency", blockedBy: [] }],
    );
    client.setQueryData(["agents"], []);
    client.setQueryData(["automation", "connectors"], [connector]);
    client.setQueryData(["automation", "runs", connector.id], []);
    client.setQueryData(["automation", "jobs", connector.id], []);
    vi.stubGlobal("localStorage", { getItem: () => null });
    vi.stubGlobal("document", { documentElement: { dataset: { skin: "classic" } } });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DraggableCard task={task} blockers={0} name="Agent" onOpen={() => {}} />
          <TaskDrawer taskId={task.id} onClose={() => {}} />
          <RelayMessage
            message={{
              id: "message",
              fromAgentId: "agent",
              to: { kind: "broadcast" },
              kind: "note",
              subject: "Readable message",
              body: "Message body",
              readBy: [],
              taskId: null,
              replyTo: null,
              createdAt: task.createdAt,
            }}
            taskTitle={undefined}
            onTask={() => {}}
            onReply={() => {}}
          />
          <ConnectorRow
            connector={connector}
            busy={false}
            onEdit={() => {}}
            onDelete={() => {}}
            onTest={() => {}}
            onToggle={() => {}}
          />
          <AutomationPage />
          <AppearancePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(html).toContain("Readable task");
    expect(html).toContain("Readable message");
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    const card = html.match(/<div\b[^>]*data-ui="card"[^>]*>([\s\S]*?)<\/button>/)?.[1];
    expect(card).toBeDefined();
    expect(card).toContain('<button type="button"');
    expect(card?.includes("touch-none")).toBe(role === "admin");
    expect(card?.includes('aria-disabled="true"')).toBe(false);
    const controls = buttons.filter((button) =>
      /aria-label="Remove dependency"|aria-haspopup="menu"|>Refresh<\//.test(button),
    );
    expect(controls.length).toBe(role === "admin" ? 4 : 3);
    for (const control of controls) expect(control.includes('disabled=""')).toBe(role !== "admin");
    expect(buttons.some((button) => />Complete<\//.test(button))).toBe(role === "admin");
    expect(buttons.some((button) => />Reply<\//.test(button))).toBe(role === "admin");
    const skins = html.match(/<input\b[^>]*type="radio"[^>]*>/g) ?? [];
    expect(skins).toHaveLength(3);
    expect(skins.some((input) => input.includes('value="pixel"'))).toBe(true);
    expect(skins.every((input) => !input.includes("disabled"))).toBe(true);
    client.clear();
  },
);
