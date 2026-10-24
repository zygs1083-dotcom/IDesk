import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type { z } from "zod";
import { AutomationPage } from "./automation-page.tsx";
import { RunCard } from "./run-card.tsx";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }), currentLang: () => "en" };
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const run: z.infer<typeof automationRunWithJobSchema> = {
  id: "run",
  jobId: "job",
  externalId: "instance",
  jobName: "Import workflow",
  jobGroup: "Warehouse project",
  status: "success",
  trigger: "START_PROCESS",
  startedAt: "2026-10-19T08:00:00Z",
  finishedAt: "2026-10-19T08:05:00Z",
  hiddenAt: null,
  url: "https://example.test/runs/instance",
  error: null,
};

test.each([null, run.jobName, run.jobGroup])(
  "run card keeps workflow, distinct project and times separate with project %s",
  (jobGroup) => {
    const client = new QueryClient();
    client.setQueryData(["auth", "me"], { role: "admin" });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <RunCard
          run={{ ...run, jobGroup }}
          now={Date.UTC(2026, 9, 19, 8, 5)}
          onToggleHidden={() => {}}
          onCopyFailure={() => {}}
          pending={false}
        />
      </QueryClientProvider>,
    );
    const heading = html.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/g);
    expect(heading).toHaveLength(1);
    expect(heading?.[0]).toContain(`title="${run.jobName}"`);
    expect(heading?.[0]).toContain(`>${run.jobName}</h3>`);
    const project = html.match(/<p\b[^>]*data-ui="card-group"[^>]*>[\s\S]*?<\/p>/g);
    if (jobGroup !== null && jobGroup !== run.jobName) {
      expect(project).toHaveLength(1);
      expect(project?.[0]).toContain(`title="${jobGroup}"`);
      expect(project?.[0]).toContain(`>${jobGroup}</p>`);
    } else expect(project).toBeNull();
    const times = html.match(/<p\b[^>]*data-ui="run-time"[^>]*>[\s\S]*?<\/p>/g);
    expect(times).toHaveLength(1);
    expect(times?.[0]).toContain("→");
    expect(times?.[0]).not.toContain(run.jobName);
    if (jobGroup !== null) expect(times?.[0]).not.toContain(jobGroup);
    expect(html).not.toContain(run.trigger);
    expect(html).toContain(`href="${run.url}"`);
    expect(html).toMatch(/<button\b/);
    client.clear();
  },
);

test("each fresh page mount selects today even when the prior stored range is all", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
  vi.stubGlobal("localStorage", { getItem: () => "all" });
  const client = new QueryClient();
  client.setQueryData(["auth", "me"], { role: "viewer" });
  client.setQueryData(
    ["automation", "connectors"],
    [{ id: "connector", name: "Connector", lastPolledAt: null, lastError: null }],
  );
  const recovered = {
    ...run,
    id: "recovered",
    status: "failed",
    startedAt: "2026-10-19T07:00:00Z",
  };
  const latestFailure = {
    ...recovered,
    id: "latest-failure",
    startedAt: "2026-10-19T09:00:00Z",
  };
  client.setQueryData(
    ["automation", "runs", "connector"],
    [
      recovered,
      run,
      latestFailure,
      {
        ...run,
        id: "historical",
        jobId: "historical-job",
        startedAt: "2026-10-18T08:00:00Z",
        finishedAt: "2026-10-18T08:05:00Z",
      },
    ],
  );
  client.setQueryData(["automation", "jobs", "connector"], []);
  for (let mount = 0; mount < 2; mount++) {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AutomationPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const range = html.match(/data-ui="automation-range"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    expect(range?.match(/aria-pressed="(?:true|false)"/g)).toEqual([
      'aria-pressed="true"',
      'aria-pressed="false"',
    ]);
    for (const column of ["completed", "failed"]) {
      const section = html.match(
        new RegExp(`id="automation-column-${column}"[^>]*>([\\s\\S]*?)</section>`),
      )?.[1];
      expect(section).toMatch(/data-ui="column-count"[^>]*>1<\/span>/);
      expect(section?.match(/data-ui="card"/g)).toHaveLength(1);
    }
  }
  client.clear();
});
