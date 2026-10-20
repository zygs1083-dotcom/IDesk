import type { eventSchema } from "@idesk/shared/task-schemas";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { translator } from "../i18n/translate.ts";
import { eventText } from "./event-text.ts";
import { ProfileEvent } from "./profile-event.tsx";
import { profileEventSummary } from "./profile-event-summary.ts";
import { ProfileModal } from "./profile-modal.tsx";
import type { Agent, Task } from "./use-office-data.ts";

const language = vi.hoisted(() => ({ current: "zh" as "zh" | "en" }));
vi.mock("../i18n/lang.tsx", () => ({
  useLang: () => ({ lang: language.current, t: translator(language.current) }),
}));

const actor = "Colleague 同事";
const recipient = "Reviewer 审查员";
const agentName = (id: string | null) =>
  id === "colleague"
    ? actor
    : id === "reviewer"
      ? recipient
      : translator(language.current)("common.human");
const event: z.infer<typeof eventSchema> = {
  id: "report-1",
  ts: "2026-10-19T03:00:00Z",
  type: "task.reported",
  agentId: "colleague",
  taskId: "task/one",
  payload: {},
};
const task: Task = {
  id: "task/one",
  title: `检查 HTTP 404 / Investigate ${"long task title 很长的任务名 ".repeat(12)}`,
  body: "",
  status: "in_progress",
  priority: "normal",
  tags: [],
  blockedBy: [],
  capabilities: [],
  publisherId: "human",
  assigneeId: "colleague",
  recruit: null,
  leaseExpiresAt: null,
  result: null,
  dueAt: null,
  createdAt: event.ts,
  updatedAt: event.ts,
  completedAt: null,
};
const message = [
  "HTTP 404: GET https://example.test/中文路径/failed-request",
  "",
  `Request: https://example.test/${"very-long-path/中文路径/".repeat(25)}?status=404&retry=0`,
  "",
  "Response: <not-found>\n检查结果：未找到目标页面。\nNext: inspect the route and report again.",
].join("\n");
const agent: Agent = {
  id: "colleague",
  name: actor,
  kind: "codex",
  host: "test-host",
  capabilities: ["review"],
  webhookUrl: null,
  client: null,
  lastSeenAt: event.ts,
  createdAt: event.ts,
  status: "online",
};

describe.each(["zh", "en"] as const)("%s colleague activity", (lang) => {
  const t = translator(lang);
  it("keeps the full report separate from its summary and leaves the global formatter intact", () => {
    language.current = lang;
    const report = { ...event, payload: { message } };
    const summary = profileEventSummary(report, t, agentName);
    expect(summary).not.toContain(actor);
    expect(summary).not.toContain(message);
    expect(summary).not.toContain(task.title);
    expect(eventText(report, t, agentName)).toContain(message);
    expect(eventText(report, t, agentName)).toContain(actor);
    const html = renderToStaticMarkup(
      <ProfileEvent event={report} task={task} agentName={agentName} />,
    );
    expect(html).toContain('aria-expanded="false"');
    const body = html.match(
      /<p class="profile-report-body profile-report-preview" id="([^"]+)">([\s\S]*?)<\/p>/,
    );
    expect(body?.[2]).toBe(
      message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    );
    expect(html).toContain(`aria-controls="${body?.[1]}"`);
    expect(html).toContain('href="/desk?task=task%2Fone"');
    expect(html).toContain(`<time dateTime="${event.ts}"`);
    expect(html).toContain(task.title);
  });

  it.each(["task.claim", "task.updated", "task.dependencies", "agent.updated", "relay.sent"])(
    "%s omits the current actor while preserving the action and recipients",
    (type) => {
      language.current = lang;
      const activity = {
        ...event,
        type,
        payload: { name: actor, to: { kind: "agent", id: "reviewer" } },
      };
      const summary = profileEventSummary(activity, t, agentName);
      expect(summary.trim()).not.toHaveLength(0);
      expect(summary).not.toContain(actor);
      if (type === "relay.sent") expect(summary).toContain(recipient);
      const html = renderToStaticMarkup(
        <ProfileEvent event={activity} task={task} agentName={agentName} />,
      );
      expect(html).not.toContain("aria-expanded");
      expect(html).toContain(task.title);
    },
  );

  it("keeps other people and webhook recipients explicit", () => {
    language.current = lang;
    const read = { ...event, type: "relay.read", payload: { reader: "human" } };
    expect(profileEventSummary(read, t, agentName)).toContain(t("common.human"));
    const failed = {
      ...event,
      type: "webhook.failed",
      payload: { agentId: "colleague", error: "HTTP 404" },
    };
    expect(profileEventSummary(failed, t, agentName)).toContain(actor);
  });

  it("links missing tasks by ID and omits the association when there is no task", () => {
    language.current = lang;
    const activity = { ...event, type: "task.complete" };
    const missing = renderToStaticMarkup(
      <ProfileEvent event={activity} task={undefined} agentName={agentName} />,
    );
    expect(missing).toContain('href="/desk?task=task%2Fone"');
    expect(missing).toContain(event.taskId);
    const unrelated = renderToStaticMarkup(
      <ProfileEvent event={{ ...activity, taskId: null }} task={undefined} agentName={agentName} />,
    );
    expect(unrelated).not.toContain("<a ");
  });

  it("keeps current tasks readable for viewers and preserves the three admin forms", () => {
    language.current = lang;
    const open = { ...task, id: "available-task", status: "open" as const };
    const props = { agent, agentName, tasks: [task, open], onClose: () => {} };
    const readonly = renderToStaticMarkup(<ProfileModal {...props} admin={false} />);
    expect(readonly).toContain('href="/desk?task=task%2Fone"');
    expect(readonly).not.toContain("<form");
    const admin = renderToStaticMarkup(<ProfileModal {...props} admin />);
    expect(admin.match(/<form/g)).toHaveLength(3);
    expect(admin).toContain(`value="${open.id}"`);
    const empty = renderToStaticMarkup(<ProfileModal {...props} tasks={[]} admin={false} />);
    expect(empty).not.toContain('class="profile-task"');
    expect(empty).not.toContain("<form");
  });
});
