import { labels } from "@idesk/shared/labels";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { expect, test, vi } from "vitest";
import { translator } from "../../i18n/translate.ts";
import { eventText } from "../../lib/event-text.ts";
import type { Task } from "../../lib/types.ts";
import { detailEvents, detailTask, detailUrl } from "./task-detail.fixtures.ts";
import { TaskDrawer } from "./task-drawer.tsx";
import { TaskTimeline } from "./task-timeline.tsx";

const language = vi.hoisted(() => ({ value: "en" as "en" | "zh" }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: language.value, t: translator(language.value) }) };
});

const agentName = (id: string | null) => (id === "human" ? "Publisher" : "Codex");

async function render(children: ReactNode) {
  const stream = await renderToReadableStream(children);
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

test("only admins retain the edit, reopen and dependency entry points in the drawer", async () => {
  language.value = "en";
  const t = translator("en");
  for (const role of ["admin", "viewer"] as const) {
    const html = await renderTask(detailTask, role);
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
    for (const label of [t("common.edit"), labels("en").action.reopen, t("desk.addDependency")])
      expect(buttons.some((button) => button.includes(`>${label}</button>`))).toBe(
        role === "admin",
      );
    expect(html).toContain(detailUrl);
  }
});
