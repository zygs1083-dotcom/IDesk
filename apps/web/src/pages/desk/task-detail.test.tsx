import { labels } from "@idesk/shared/labels";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, test, vi } from "vitest";
import { translator } from "../../i18n/translate.ts";
import { eventText } from "../../lib/event-text.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { detailEvents, detailTask, detailUrl } from "./task-detail.fixtures.ts";
import { TaskDetails } from "./task-details.tsx";
import { TaskDrawer } from "./task-drawer.tsx";
import { TaskTimeline } from "./task-timeline.tsx";

const language = vi.hoisted(() => ({ value: "en" as "en" | "zh" }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: language.value, t: translator(language.value) }) };
});

const agentName = (id: string | null) => (id === "human" ? "Publisher" : "Codex");

async function render(children: ReactNode) {
  const stream = await renderToReadableStream(children, {
    progressiveChunkSize: Number.POSITIVE_INFINITY,
  });
  await stream.allReady;
  return new Response(stream).text();
}

async function renderTask(task: Task, role: "admin" | "viewer" = "admin") {
  const client = new QueryClient();
  client.setQueryData(["auth", "me"], { role });
  client.setQueryData(["task", task.id], task);
  client.setQueryData(["task", task.id, "events"], detailEvents);
  client.setQueryData(["tasks"], [task]);
  client.setQueryData(["agents"], []);
  const html = await render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TaskDrawer taskId={task.id} onClose={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  client.clear();
  return html;
}

test.each([
  ["short", "短任务"],
  ["long URL", `${detailTask.title} ${detailUrl}`],
  ["extreme", `${"任务 LongEnglishTaskName".repeat(500)} ${detailUrl}`],
] as const)(
  "%s title stays complete in the heading without a duplicate full-title area on opening",
  async (_, title) => {
    language.value = "en";
    const html = await renderTask({ ...detailTask, title });
    const heading = html.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/)?.[0] as string;
    expect(heading).toContain(title);
    expect(heading).not.toContain("<div");
    expect(html.replace(/<[^>]*>/g, "").split(title)).toHaveLength(2);
    expect(html).not.toContain("task-full-title");
  },
);

test.each(["zh", "en"] as const)(
  "%s keeps requirements and multi-paragraph results separate, ordered and complete",
  async (lang) => {
    language.value = lang;
    const html = await renderTask(detailTask);
    const sections = html.match(/<section\b[\s\S]*?<\/section>/g) ?? [];
    expect(sections).toHaveLength(5);
    expect(sections[0]).toContain("<strong>HTTP 404</strong>");
    expect(sections[0]).toContain("验证下一行。");
    expect(sections[0]).not.toContain(detailUrl);
    expect(sections[1]).toContain(detailUrl);
    expect(sections[1]).toContain("保留最后一段结果。");
    expect(sections[1]?.match(/<p>/g)).toHaveLength(3);
    expect(sections[0]).toContain('data-lines="6" data-expanded="false"');
    expect(sections[1]).toContain('data-lines="6" data-expanded="false"');
    expect(sections[2]).toContain("<dl ");
    expect(sections[3]).toContain(translator(lang)("desk.noDependencies"));
    expect(sections[4]).toContain("<ol ");
  },
);

test.each(["zh", "en"] as const)("%s distinguishes absent results by task status", async (lang) => {
  language.value = lang;
  const t = translator(lang);
  for (const status of ["in_progress", "done"] as const) {
    for (const result of [null, "", " \n "]) {
      const html = await renderTask({ ...detailTask, status, result });
      const expected = status === "done" ? "desk.noResultProvided" : "desk.noResultYet";
      const other = status === "done" ? "desk.noResultYet" : "desk.noResultProvided";
      expect(html).toContain(t(expected));
      expect(html).not.toContain(t(other));
    }
  }
});

test.each(["zh", "en"] as const)(
  "%s separates report bodies from action summaries and timestamps without changing activity text",
  async (lang) => {
    language.value = lang;
    const html = await render(<TaskTimeline events={detailEvents} agentName={agentName} />);
    const items = html.match(/<li\b[\s\S]*?<\/li>/g) ?? [];
    expect(items).toHaveLength(10);
    for (const [index, event] of detailEvents.entries()) {
      const item = items[index] as string;
      expect(item).toContain(`dateTime="${event.ts}"`);
      const summary = item.match(/<p\b[^>]*>[\s\S]*?<\/p>/)?.[0] as string;
      if (event.type === "task.reported") {
        const message = String(event.payload.message);
        expect(summary).not.toContain(message);
        expect(item.split(message)).toHaveLength(2);
        expect(item).toContain('data-lines="2" data-expanded="false"');
        expect(eventText(event, agentName, lang)).toContain(message);
      } else {
        expect(summary).toContain(eventText(event, agentName, lang));
        expect(item).not.toContain("task-excerpt");
      }
    }
  },
);

test.each(["zh", "en"] as const)(
  "%s details combine result/report PRs and show completed wall time from hidden earlier events",
  async (lang) => {
    language.value = lang;
    const client = new QueryClient();
    const result = "https://github.com/team/result/pull/12";
    const events = [
      {
        ...(detailEvents[0] as TaskEvent),
        id: "earlier-claim",
        ts: "2026-10-19T11:59:00Z",
        type: "task.claim",
        payload: { from: "assigned", to: "in_progress" },
      },
      {
        ...(detailEvents[3] as TaskEvent),
        id: "earlier-report",
        type: "task.reported",
        payload: { message: `${result}/files https://github.com/team/report/pull/12` },
      },
      ...detailEvents,
    ];
    const html = await render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <TaskDetails
            task={{ ...detailTask, result }}
            events={events}
            agentName={agentName}
            onError={() => {}}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const badges = html.match(/<span data-ui="pr-badges"[\s\S]*?<\/span>/)?.[0] as string;
    expect(badges.match(/<a /g)).toHaveLength(2);
    expect(badges).toContain(`href="${result}"`);
    expect(badges).toContain('href="https://github.com/team/report/pull/12"');
    expect(html).toContain(lang === "zh" ? "总耗时 10 分" : "Total 10 min");
    const timeline = html.match(/<ol\b[\s\S]*?<\/ol>/)?.[0] as string;
    expect(timeline.match(/<li\b/g)).toHaveLength(10);
    expect(timeline).not.toContain("https://github.com/team/report/pull/12");
    expect(timeline).not.toContain('dateTime="2026-10-19T11:59:00Z"');
    client.clear();
  },
);

test("only admins retain the edit, reopen and dependency entry points in the drawer", async () => {
  language.value = "en";
  const t = translator("en");
  for (const role of ["admin", "viewer"] as const) {
    const html = await renderTask(detailTask, role);
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    for (const action of ["desk.copyTaskId", "desk.copyTaskLink", "desk.copyAsMarkdown"] as const)
      expect(buttons.some((button) => button.includes(`aria-label="${t(action)}"`))).toBe(true);
    for (const label of [t("common.edit"), labels("en").action.reopen, t("desk.addDependency")])
      expect(buttons.some((button) => button.includes(`>${label}</button>`))).toBe(
        role === "admin",
      );
    expect(html).toContain(detailUrl);
  }
});
