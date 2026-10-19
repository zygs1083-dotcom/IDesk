import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { AgentsPage } from "../agents/agents-page.tsx";
import { ScheduleRow } from "./schedule-row.tsx";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }), currentLang: () => "en" };
});

test("masked HTTP schedules and agent webhook values render without URL parsing", () => {
  const client = new QueryClient();
  client.setQueryData(
    ["agents"],
    [
      {
        id: "agent",
        name: "Agent",
        kind: "codex",
        host: "test",
        capabilities: [],
        webhookUrl: "••••••",
        client: null,
        status: "offline",
        lastSeenAt: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ],
  );
  const agents = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AgentsPage />
    </QueryClientProvider>,
  );
  expect(agents).toContain("Configured (hidden)");
  const row = renderToStaticMarkup(
    <table>
      <tbody>
        <ScheduleRow
          schedule={{
            id: "schedule",
            name: "HTTP",
            cron: "* * * * *",
            timezone: "UTC",
            enabled: false,
            running: false,
            action: { type: "http", method: "POST", url: "••••••", headers: {}, body: "••••••" },
            lastRunAt: null,
            lastStatus: null,
            nextRunAt: null,
          }}
          connectors={[]}
          busy={false}
          running={false}
          canEdit={true}
          onHistory={() => {}}
          onToggle={() => {}}
          onRun={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </tbody>
    </table>,
  );
  expect(row).toContain("POST · Configured (hidden)");
  client.clear();
});
