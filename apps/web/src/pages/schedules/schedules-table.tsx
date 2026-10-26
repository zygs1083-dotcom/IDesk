import { useLang } from "../../i18n/lang.tsx";
import { ScheduleRow } from "./schedule-row.tsx";
import type { Connector, Schedule } from "./types.ts";

export function SchedulesTable({
  schedules,
  connectors,
  busy,
  pendingRuns,
  canEdit,
  onHistory,
  onToggle,
  onRun,
  onEdit,
  onDelete,
}: {
  schedules: Schedule[];
  connectors: Connector[];
  busy: boolean;
  pendingRuns: string[];
  canEdit: boolean;
  onHistory: (schedule: Schedule) => void;
  onToggle: (schedule: Schedule, enabled: boolean) => void;
  onRun: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
}) {
  const { t } = useLang();
  return (
    <div data-ui="panel" className="overflow-x-auto rounded-panel border border-line bg-surface">
      <table className="w-full text-left text-secondary">
        <thead className="border-b border-line text-label text-text-2">
          <tr>
            {[
              t("common.name"),
              t("schedules.frequency"),
              t("common.action"),
              t("schedules.lastRun"),
              t("schedules.nextRun"),
              t("common.enable"),
              "",
            ].map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule) => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              connectors={connectors}
              busy={busy}
              running={schedule.running || pendingRuns.includes(schedule.id)}
              canEdit={canEdit}
              onHistory={() => onHistory(schedule)}
              onToggle={(enabled) => onToggle(schedule, enabled)}
              onRun={() => onRun(schedule)}
              onEdit={() => onEdit(schedule)}
              onDelete={() => onDelete(schedule)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
