import { Bot, ListTodo, Send } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Button } from "../../components/button.tsx";
import { EmptyState } from "../../components/empty-state.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { eventText } from "../../lib/event-text.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useTasks } from "../../lib/use-tasks.ts";
import { TaskDrawer } from "../desk/task-drawer.tsx";
import { groupEvents } from "./group-events.ts";
import { useActivity } from "./use-activity.ts";

export function ActivityPage() {
  const { lang, t } = useLang();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const taskId = params.get("task");
  const typeParam = params.get("type");
  const type =
    typeParam === "task" || typeParam === "relay" || typeParam === "agent" ? typeParam : "all";
  const agentId = params.get("agentId") ?? "";
  const { events, error, isPending, hasNextPage, fetchNextPage, isFetching, refetch } = useActivity(
    type,
    agentId,
  );
  const { agents, agentName } = useAgents();
  const { tasks } = useTasks();
  const taskTitles = new Map(tasks.map((task) => [task.id, task.title]));
  const groups = groupEvents(events, lang);
  function setFilter(key: "type" | "agentId", value: string) {
    if (value === (key === "type" ? type : agentId)) return;
    const next = new URLSearchParams(params);
    if (key === "type" ? value !== "all" : value !== "") next.set(key, value);
    else next.delete(key);
    navigate({ search: next.toString(), hash: location.hash });
  }
  function select(id: string | null) {
    const next = new URLSearchParams(params);
    if (id) next.set("task", id);
    else next.delete("task");
    navigate({ search: next.toString(), hash: location.hash }, { replace: true });
  }
  return (
    <div data-scene="activity" className="space-y-6">
      <PageHeader
        title={t("nav.activity")}
        toolbar={
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3 whitespace-nowrap text-secondary">
            <Segmented
              label={t("common.type")}
              value={type}
              onChange={(value) => setFilter("type", value)}
              options={[
                { value: "all", label: t("common.all") },
                { value: "task", label: t("common.tasks") },
                { value: "relay", label: t("nav.relay") },
                { value: "agent", label: t("nav.agents") },
              ]}
            />
            <label className="flex min-w-0 max-w-full items-center gap-2 text-text-2">
              {t("nav.agents")}
              <select
                className="min-w-0 max-w-full rounded-control border border-line bg-surface px-3 py-2 text-text"
                value={agentId}
                onChange={(event) => setFilter("agentId", event.target.value)}
              >
                <option value="">{t("common.all")}</option>
                {agentId && !agents.some((agent) => agent.id === agentId) && (
                  <option value={agentId}>{agentId}</option>
                )}
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agentName(agent.id)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      />
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
        <EmptyState title={t("activity.empty")} description={t("empty.activity")} scene="ledger" />
      )}
      <div data-ui="activity-ledger" data-empty={groups.length === 0}>
        {groups.map((group) => (
          <section data-ui="log-page" key={group.day} className="space-y-2">
            <h2 className="text-label text-text-2">{group.label}</h2>
            <ol className="divide-y divide-line">
              {group.events.map((event) => {
                const Icon = event.type.startsWith("relay.")
                  ? Send
                  : event.type.startsWith("agent.")
                    ? Bot
                    : ListTodo;
                const iconName = event.type.startsWith("relay.")
                  ? "mail"
                  : event.type.startsWith("agent.")
                    ? "agent"
                    : "desk";
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
                    <PixelIcon
                      name={iconName}
                      fallback={<Icon size={16} strokeWidth={1.5} />}
                      className="shrink-0 text-text-2"
                    />
                    <p className="min-w-0 break-words text-body">
                      {eventText(event, agentName, lang)}
                      {event.taskId && (
                        <>
                          {" "}
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            className="max-w-full wrap-anywhere p-0 text-left text-accent underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            onClick={() => select(event.taskId)}
                          >
                            {taskTitles.get(event.taskId) ?? event.taskId.slice(0, 8)}
                          </button>
                        </>
                      )}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      {hasNextPage && (
        <Button
          variant="ghost"
          className="mx-auto flex"
          onClick={() => void fetchNextPage()}
          disabled={isFetching}
        >
          {t(isFetching ? "activity.loading" : "activity.loadEarlier")}
        </Button>
      )}
      {!isPending && !error && events.length > 0 && !hasNextPage && (
        <p className="text-center text-secondary text-text-2">{t("activity.end")}</p>
      )}
      {taskId && <TaskDrawer taskId={taskId} onClose={() => select(null)} />}
    </div>
  );
}
