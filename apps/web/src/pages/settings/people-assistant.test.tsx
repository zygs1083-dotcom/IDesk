import type { Person } from "@idesk/shared/people-schemas";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type { Task } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { TaskInformation } from "../desk/task-information.tsx";
import { TaskTimeline } from "../desk/task-timeline.tsx";
import { AssistantPage } from "./assistant-page.tsx";
import { PeoplePage } from "./people-page.tsx";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }), currentLang: () => "en" };
});
afterEach(() => vi.unstubAllGlobals());
const person: Person = {
  id: "p_member",
  name: "Pat",
  role: "member",
  createdAt: "2026-10-20T00:00:00Z",
  bindings: [
    {
      id: "binding",
      personId: "p_member",
      channel: "feishu",
      externalId: "external",
      displayName: "Platform Pat",
      createdAt: "2026-10-20T00:00:00Z",
    },
  ],
};
const task: Task = {
  id: "task",
  title: "Release report",
  body: "",
  status: "open",
  priority: "normal",
  tags: [],
  capabilities: [],
  publisherId: person.id,
  assigneeId: null,
  recruit: null,
  dueAt: null,
  blockedBy: [],
  leaseExpiresAt: null,
  result: null,
  createdAt: person.createdAt,
  updatedAt: person.createdAt,
  completedAt: null,
};

test.each(["viewer", "admin"])(
  "%s sees people and channel status with appropriate editing controls",
  (role) => {
    const client = new QueryClient();
    client.setQueryData(["auth", "me"], { role });
    client.setQueryData(["people"], [person]);
    client.setQueryData(["assistant", "settings"], {
      protocol: "openai-chat",
      baseUrl: "https://model.invalid",
      apiKey: "••••••",
      model: "test",
      enabled: true,
    });
    client.setQueryData(
      ["assistant", "channels"],
      [{ channel: "feishu", enabled: true, connected: true, lastError: null, lastMessageAt: null }],
    );
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PeoplePage />
          <AssistantPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(html).toContain("Pat");
    expect(html).toContain('title="Platform Pat"');
    expect(html).toContain("Connected");
    expect(html.includes('aria-haspopup="menu"')).toBe(role === "admin");
    expect(html.includes('type="password"')).toBe(role === "admin");
    expect(html.includes('aria-label="Try it"')).toBe(role === "admin");
    expect(html.includes("/settings/plugins?plugin=feishu")).toBe(role === "admin");
    client.clear();
  },
);

function TaskPublisher({ publisherId }: { publisherId: string }) {
  const { agentName } = useAgents();
  return (
    <>
      <TaskInformation task={{ ...task, publisherId }} agentName={agentName} />
      <TaskTimeline
        events={[
          {
            id: "event",
            type: "task.created",
            ts: person.createdAt,
            agentId: null,
            taskId: task.id,
            payload: { personId: publisherId, via: "feishu" },
          },
        ]}
        agentName={agentName}
      />
    </>
  );
}

test.each([
  ["human", "Admin"],
  ["p_member", "Pat"],
  ["p_missing", "Deleted person"],
  ["old-agent", "Old@host"],
  ["missing-agent", "Deleted agent"],
])(
  "task details and timeline resolve publisher %s without changing agent identities",
  (id, name) => {
    const client = new QueryClient();
    client.setQueryData(["agents"], [{ id: "old-agent", name: "Old", host: "host" }]);
    client.setQueryData(["people"], [person]);
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <TaskPublisher publisherId={id} />
      </QueryClientProvider>,
    );
    expect(html).toContain(`<dd class="min-w-0 [overflow-wrap:anywhere]">${name}</dd>`);
    expect(html).toContain(`${name} published via Feishu`);
    client.clear();
  },
);
