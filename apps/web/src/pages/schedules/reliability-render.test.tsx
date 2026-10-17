import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { ScheduleRow } from "./schedule-row.tsx";
import { SchedulesPage } from "./schedules-page.tsx";
import type { Schedule } from "./types.ts";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }), currentLang: () => "en" };
});
const schedule: Schedule = {
  id: "schedule",
  name: "HTTP",
  cron: "* * * * *",
  timezone: "UTC",
  enabled: false,
  running: true,
  action: { type: "http", method: "GET", url: "••••••", headers: {} },
  lastRunAt: null,
  lastStatus: null,
  nextRunAt: null,
};

test("running execution disables its run button while keeping history accessible", () => {
  const html = renderToStaticMarkup(
    <table>
      <tbody>
        <ScheduleRow
          schedule={schedule}
          connectors={[]}
          busy={false}
          running
          canEdit
          onHistory={() => {}}
          onToggle={() => {}}
          onRun={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </tbody>
    </table>,
  );
  expect(html).toContain("Running");
  expect(html).toMatch(/<button[^>]* disabled=""[^>]*>Run now<\/button>/);
  expect(html).toMatch(/<button(?![^>]* disabled=)[^>]*>Execution history<\/button>/);
});

test("viewer schedules expose history without run or edit actions", () => {
  const client = new QueryClient();
  client.setQueryData(["auth", "me"], { role: "viewer" });
  client.setQueryData(["schedules"], [schedule]);
  client.setQueryData(["automation", "connectors"], []);
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <SchedulesPage />
    </QueryClientProvider>,
  );
  expect(html).toContain("Execution history");
  expect(html).not.toContain("Run now");
  expect(html).not.toContain('aria-haspopup="menu"');
  expect(html).not.toMatch(/>Create<\/button>/);
  expect(html).not.toContain('role="switch"');
  client.clear();
});
