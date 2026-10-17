import { Bot, ListTodo, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { eventText } from "../../lib/event-text.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useTasks } from "../../lib/use-tasks.ts";
import { groupEvents } from "./group-events.ts";
import { useActivity } from "./use-activity.ts";

export function ActivityPage() {
  const { lang, t } = useLang();
  const [type, setType] = useState("all");
  const [agentId, setAgentId] = useState("");
  const { events, error, isPending, hasNextPage, fetchNextPage, isFetching, refetch } = useActivity(
    type,
    agentId,
  );
  const { agents, agentName } = useAgents();
  const { tasks } = useTasks();
  const taskTitles = new Map(tasks.map((task) => [task.id, task.title]));
  const groups = groupEvents(events, lang);
  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.activity")} />
      <div className="flex flex-wrap items-center gap-3 whitespace-nowrap text-secondary">
        <Segmented
          label={t("common.type")}
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: t("common.all") },
            { value: "task", label: t("common.tasks") },
            { value: "relay", label: t("nav.relay") },
            { value: "agent", label: t("nav.agents") },
          ]}
        />
        <label className="flex items-center gap-2 text-text-2">
          {t("nav.agents")}
          <select
            className="rounded-control border border-line bg-surface px-3 py-2 text-text"
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
          >
            <option value="">{t("common.all")}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agentName(agent.id)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {isPending && (
        <p role="status" className="text-secondary text-text-2">
          {t("activity.loading")}
        </p>
      )}
      {error && (
        <Button onClick={() => void refetch()} disabled={isFetching}>
          {t("activity.retry")}
        </Button>
      )}
      {!isPending && !error && groups.length === 0 && (
        <p className="py-16 text-center text-secondary text-text-2">{t("activity.empty")}</p>
      )}
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.day} className="space-y-2">
            <h2 className="text-label text-text-2">{group.label}</h2>
            <ol className="divide-y divide-line">
              {group.events.map((event) => {
                const Icon = event.type.startsWith("relay.")
                  ? Send
                  : event.type.startsWith("agent.")
                    ? Bot
                    : ListTodo;
                return (
                  <li key={event.id} className="flex items-center gap-4 py-3">
                    <time
                      dateTime={event.ts}
                      className="w-12 shrink-0 text-secondary tabular-nums text-text-2"
                    >
                      {new Date(event.ts).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </time>
                    <Icon
                      size={16}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="shrink-0 text-text-2"
                    />
                    <p className="truncate text-body">
                      {eventText(event, agentName, lang)}
                      {event.taskId &&
                        ` ${taskTitles.get(event.taskId) ?? event.taskId.slice(0, 8)}`}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      {hasNextPage && (
        <Button onClick={() => void fetchNextPage()} disabled={isFetching}>
          {t(isFetching ? "activity.loading" : "activity.loadEarlier")}
        </Button>
      )}
      {!isPending && !error && events.length > 0 && !hasNextPage && (
        <p className="text-center text-secondary text-text-2">{t("activity.end")}</p>
      )}
    </div>
  );
}
