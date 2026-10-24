import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";
import type { HealthFilter, HealthQueryStatus, HealthTasks } from "./board-health-state.ts";

const options = [
  { value: "in_progress", label: "desk.healthInProgress", dot: "bg-status-done" },
  { value: "silent", label: "desk.healthSilent", dot: "bg-status-paused" },
  { value: "blocked", label: "desk.healthBlocked", dot: "bg-status-failed" },
  { value: "waiting", label: "desk.healthWaiting", dot: "bg-text-3" },
  { value: "overdue", label: "desk.healthOverdue", dot: "bg-status-paused" },
] as const;

export function BoardHealth({
  health,
  status,
  value,
  onChange,
}: {
  health: HealthTasks;
  status: HealthQueryStatus;
  value: HealthFilter | null;
  onChange: (value: HealthFilter | null) => void;
}) {
  const { t } = useLang();
  const buttonClass =
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-control border px-2 py-1 text-label text-text-2 transition-colors duration-hover ease-hover hover:text-text focus-visible:outline-2 focus-visible:outline-accent";
  const items = options.map((option) => {
    const queryStatus =
      option.value === "silent" || option.value === "waiting" ? status[option.value] : "success";
    const count =
      queryStatus === "success" ? health[option.value].size : queryStatus === "pending" ? "…" : "—";
    return { ...option, queryStatus, count };
  });
  return (
    <fieldset data-ui="board-health" className="min-w-0">
      <legend className="sr-only">{t("desk.health")}</legend>
      <select
        aria-label={t("desk.health")}
        value={value ?? ""}
        onChange={(event) => onChange((event.target.value as HealthFilter) || null)}
        className="w-full rounded-control border border-line bg-surface-2 px-2 py-1 text-label text-text-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sidebar:hidden"
      >
        <option value="">{t("common.all")}</option>
        {items.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.label)} {option.count}
          </option>
        ))}
      </select>
      <div className="hidden min-w-0 flex-wrap items-center gap-1 sidebar:flex">
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cn(
            buttonClass,
            value === null ? "border-line-strong bg-surface-2" : "border-transparent",
          )}
        >
          {t("common.all")}
        </button>
        {items.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            aria-busy={option.queryStatus === "pending"}
            onClick={() => onChange(value === option.value ? null : option.value)}
            className={cn(
              buttonClass,
              value === option.value ? "border-line-strong bg-surface-2" : "border-transparent",
            )}
          >
            <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", option.dot)} />
            <span>{t(option.label)}</span>
            <span className="tabular-nums">{option.count}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
