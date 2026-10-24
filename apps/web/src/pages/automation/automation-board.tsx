import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import type { z } from "zod";
import { ColumnJump } from "../../components/column-jump.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { JobCard } from "./job-card.tsx";
import type { Upcoming } from "./next-runs.ts";
import { RunCard } from "./run-card.tsx";
import { RunColumn, runColumns } from "./run-column.tsx";

type Run = z.infer<typeof automationRunWithJobSchema>;

export function AutomationBoard({
  runs,
  upcoming,
  now,
  error,
  onToggleHidden,
  onCopyFailure,
  pending,
}: {
  runs: Run[];
  upcoming: Upcoming[];
  now: number;
  error: string | null;
  onToggleHidden: (run: Run) => void;
  onCopyFailure: (run: Run) => void;
  pending: boolean;
}) {
  const { t } = useLang();
  const columns = [
    { id: "waiting", label: t("automation.waiting"), color: "bg-status-open" },
    { id: "running", label: t("automation.running"), color: "bg-status-in-progress" },
    { id: "completed", label: t("automation.done"), color: "bg-status-done" },
    { id: "failed", label: t("common.failed"), color: "bg-status-failed" },
  ] as const;
  return (
    <>
      <ColumnJump
        options={columns.map((column) => ({
          id: `automation-column-${column.id}`,
          label: column.label,
        }))}
      />
      <section
        data-ui="task-wall"
        data-console=""
        aria-label={t("automation.board")}
        className="flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden pb-3"
      >
        {columns.map((column) => {
          const items = runs.filter((run) => runColumns[run.status] === column.id);
          return (
            <RunColumn
              key={column.id}
              id={`automation-column-${column.id}`}
              label={column.label}
              count={items.length + (column.id === "waiting" ? upcoming.length : 0)}
              color={column.color}
              error={column.id === "waiting" ? error : null}
            >
              {items.map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  now={now}
                  onToggleHidden={onToggleHidden}
                  onCopyFailure={onCopyFailure}
                  pending={pending}
                />
              ))}
              {column.id === "waiting" &&
                upcoming.map((item) => <JobCard key={item.job.id} {...item} now={now} />)}
            </RunColumn>
          );
        })}
      </section>
    </>
  );
}
