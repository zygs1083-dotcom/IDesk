import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { z } from "zod";
import { AutomationFilters } from "./automation-filters.tsx";
import { RunCard } from "./run-card.tsx";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }), currentLang: () => "en" };
});

test.each(["viewer", "admin"])(
  "%s can view hidden runs, only admin can change terminal visibility",
  (role) => {
    const client = new QueryClient();
    client.setQueryData(["auth", "me"], { role });
    const run: z.infer<typeof automationRunWithJobSchema> = {
      id: "run",
      jobId: "job",
      externalId: "external",
      jobName: "Import",
      jobGroup: null,
      status: "success",
      trigger: null,
      startedAt: null,
      finishedAt: null,
      hiddenAt: null,
      url: null,
      error: null,
    };
    for (const status of ["success", "failed", "canceled", "waiting", "running"] as const) {
      for (const hiddenAt of [null, new Date().toISOString()]) {
        const html = renderToStaticMarkup(
          <QueryClientProvider client={client}>
            <RunCard
              run={{ ...run, status, hiddenAt }}
              now={Date.now()}
              isAdmin={role === "admin"}
              onToggleHidden={() => {}}
              onCopyFailure={() => {}}
              pending={false}
            />
          </QueryClientProvider>,
        );
        expect(/aria-label="(?:Hide|Unhide)"/.test(html)).toBe(
          role === "admin" && status !== "waiting" && status !== "running",
        );
        expect(html.includes('aria-label="Copy failure details"')).toBe(status === "failed");
        expect(html.includes("opacity-60")).toBe(hiddenAt !== null);
      }
    }
    for (const showHidden of [true, false]) {
      const html = renderToStaticMarkup(
        <AutomationFilters
          connectors={[]}
          selected=""
          onSelect={() => {}}
          search=""
          onSearch={() => {}}
          onClearSearch={() => {}}
          range="today"
          onRange={() => {}}
          hiddenCount={1}
          showHidden={showHidden}
          onShowHidden={() => {}}
        />,
      );
      const toggle = html.match(
        /<button[^>]*aria-pressed="(?:true|false)"[^>]*>[\s\S]*?<\/button>/g,
      );
      expect(toggle).toHaveLength(3);
      expect(toggle?.[2]).toContain(`aria-pressed="${showHidden}"`);
    }
    client.clear();
  },
);
