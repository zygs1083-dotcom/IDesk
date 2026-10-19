import type { webhookTestResultSchema } from "@idesk/shared/agent-schemas";
import type { Lang } from "@idesk/shared/labels";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { translator } from "../../i18n/translate.ts";
import { request } from "../../lib/api.ts";
import { eventText } from "../../lib/event-text.ts";
import { relativeTime } from "../../lib/format.ts";
import type { Agent, Task, TaskEvent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useSession } from "../../lib/use-session.ts";
import { AgentStats } from "./agent-stats.tsx";

export function formatAgentClient(client: string | null, lang: Lang): string {
  const t = translator(lang);
  if (!client) return t("agents.clientNotReported");
  return client.replace(
    /^idesk-receiver\/([^ ]+) \([^;]+; wake=(codex|command)\)$/,
    (_match, version: string, wake: string) =>
      t("agents.officialReceiver", {
        version,
        wake: wake === "command" ? t("agents.customCommand") : wake,
      }),
  );
}

export function AgentDetails({ agent }: { agent: Agent }) {
  const { lang, t } = useLang();
  const { isAdmin } = useSession();
  const { agentName } = useAgents();
  const tasks = useQuery({
    queryKey: ["tasks", "assignee", agent.id],
    queryFn: () => request<Task[]>(`/tasks?assignee=${encodeURIComponent(agent.id)}`),
  });
  const events = useQuery({
    queryKey: ["events", "agent", agent.id],
    queryFn: () => request<TaskEvent[]>(`/events?agentId=${encodeURIComponent(agent.id)}`),
  });
  const test = useMutation({
    mutationFn: () =>
      request<z.infer<typeof webhookTestResultSchema>>(`/agents/${agent.id}/webhook-test`, {
        method: "POST",
      }),
  });
  const testFailure = test.error?.message ?? test.data?.error;
  const failureReason =
    testFailure === "Request timed out"
      ? t("agents.pushTimeout")
      : testFailure === "HTTP request failed"
        ? t("agents.pushUnreachable")
        : testFailure;
  const current = tasks.data?.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );
  const taskTitles = new Map(tasks.data?.map((task) => [task.id, task.title]));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <AgentStats agentId={agent.id} />
      <section className="flex flex-wrap items-start justify-between gap-2 md:col-span-2">
        <div className="min-w-0 flex-1 space-y-1 text-secondary">
          <p>
            <span className="text-text-2">{t("agents.receiver")}</span>
            {agent.webhookUrl ? (
              <span className={agent.client ? "break-words" : "break-words text-text-2"}>
                {formatAgentClient(agent.client, lang)}
              </span>
            ) : (
              <span className="break-words text-text-2">{t("agents.noWebhook")}</span>
            )}
          </p>
          {test.data?.ok && (
            <p role="status" className="text-status-done">
              {t("agents.pushResponse", {
                status: test.data.status ?? "—",
                duration: test.data.durationMs,
              })}
            </p>
          )}
          {failureReason && (
            <p role="status" className="break-words text-status-failed">
              {t("agents.pushFailed", { reason: failureReason })}
            </p>
          )}
          {test.data && !test.data.notifierEnabled && (
            <p className="break-words text-status-paused">{t("agents.notifierDisabled")}</p>
          )}
        </div>
        {agent.webhookUrl && isAdmin && (
          <Button
            variant="ghost"
            className="shrink-0 whitespace-nowrap"
            disabled={test.isPending}
            onClick={() => {
              test.reset();
              test.mutate();
            }}
          >
            {t(test.isPending ? "agents.pushing" : "agents.testPush")}
          </Button>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-label text-text-2">{t("agents.currentTasks")}</h2>
        {tasks.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {tasks.error.message}
          </p>
        )}
        {current?.map((task) => (
          <p key={task.id} className="truncate text-secondary">
            {task.title}
          </p>
        ))}
        {current?.length === 0 && (
          <p className="text-secondary text-text-2">{t("agents.noCurrentTasks")}</p>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-label text-text-2">{t("agents.recentEvents")}</h2>
        {events.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {events.error.message}
          </p>
        )}
        {events.data?.slice(0, 5).map((event) => (
          <div key={event.id} className="flex gap-3 text-secondary">
            <span className="shrink-0 tabular-nums text-text-2">
              {relativeTime(new Date(event.ts), lang)}
            </span>
            <span className="truncate">
              {eventText(event, agentName, lang)}
              {event.taskId && ` ${taskTitles.get(event.taskId) ?? event.taskId.slice(0, 8)}`}
            </span>
          </div>
        ))}
        {events.data?.length === 0 && (
          <p className="text-secondary text-text-2">{t("agents.noRecentEvents")}</p>
        )}
      </section>
    </div>
  );
}
