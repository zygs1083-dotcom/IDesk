import { Button, IconButton } from "../../components/button.tsx";
import { Menu } from "../../components/menu.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { Switch } from "../../components/switch.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import { StatusDot } from "../desk/status-dot.tsx";
import { cronText } from "./cron-text.ts";
import { formatScheduleTime } from "./schedule-preview.tsx";
import type { Connector, Schedule } from "./types.ts";

export function ScheduleRow({
  schedule,
  connectors,
  busy,
  running,
  canEdit,
  onHistory,
  onToggle,
  onRun,
  onEdit,
  onDelete,
}: {
  schedule: Schedule;
  connectors: Connector[];
  busy: boolean;
  running: boolean;
  canEdit: boolean;
  onHistory: () => void;
  onToggle: (enabled: boolean) => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { lang, t } = useLang();
  const action = schedule.action;
  let summary: string;
  switch (action.type) {
    case "publish_task":
      summary = t("schedules.publish", { task: action.template.title });
      break;
    case "http":
      summary = `${action.method} · ${t("common.secretConfigured")}`;
      break;
    case "connector_trigger":
      summary = t("schedules.trigger", {
        connector:
          connectors.find((connector) => connector.id === action.connectorId)?.name ??
          action.connectorId,
        workflow: action.jobExternalId,
      });
      break;
  }
  const next = schedule.enabled && schedule.nextRunAt ? new Date(schedule.nextRunAt) : null;
  const nextText = next ? formatScheduleTime(next, schedule.timezone, lang) : "—";
  return (
    <tr className="border-b border-line last:border-b-0 hover:bg-surface-2">
      <td className="px-4 py-3 text-body">
        <span className="block max-w-48 truncate" title={schedule.name}>
          {schedule.name}
        </span>
      </td>
      <td
        className="whitespace-nowrap px-4 py-3 text-text-2"
        title={`${schedule.cron} · ${schedule.timezone}`}
      >
        {cronText(schedule.cron, lang)}
      </td>
      <td className="px-4 py-3 text-text-2">
        <span className="block max-w-64 truncate" title={summary}>
          {summary}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-text-2">
        <span className="flex items-center gap-2">
          {running && (
            <>
              <StatusDot status="in_progress" />
              {t("schedules.running")}
            </>
          )}
          {!running && schedule.lastStatus && (
            <span
              title={schedule.lastStatus === "success" ? t("common.success") : t("common.failed")}
              className={cn(
                "size-2 shrink-0 rounded-full",
                schedule.lastStatus === "success" ? "bg-status-done" : "bg-status-failed",
              )}
            />
          )}
          {!running &&
            (schedule.lastRunAt ? relativeTime(new Date(schedule.lastRunAt), lang) : "—")}
        </span>
      </td>
      <td
        className="whitespace-nowrap px-4 py-3 tabular-nums text-text-2"
        title={schedule.timezone}
      >
        {nextText}
      </td>
      <td className="px-4 py-3">
        {canEdit ? (
          <Switch
            label={t("common.enableNamed", { name: schedule.name })}
            checked={schedule.enabled}
            disabled={busy}
            onChange={onToggle}
          />
        ) : (
          <span className="text-text-2">
            {t(schedule.enabled ? "schedules.enabled" : "schedules.disabled")}
          </span>
        )}
      </td>
      <td className="px-2 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <span className="pixel-legacy">
            <Button onClick={onHistory}>{t("schedules.history")}</Button>
          </span>
          <span className="pixel-only">
            <IconButton title={t("schedules.history")} onClick={onHistory}>
              <PixelIcon name="history" />
            </IconButton>
          </span>
          {canEdit && (
            <>
              <span className="pixel-legacy">
                <Button disabled={busy || running} onClick={onRun}>
                  {t("schedules.runNow")}
                </Button>
              </span>
              <span className="pixel-only">
                <IconButton
                  title={t("schedules.runNow")}
                  disabled={busy || running}
                  onClick={onRun}
                >
                  <PixelIcon name="play" />
                </IconButton>
              </span>
            </>
          )}
          {canEdit && (
            <Menu
              label={t("common.actionsFor", { name: schedule.name })}
              disabled={busy}
              items={[
                { label: t("common.edit"), onSelect: onEdit },
                { label: t("common.delete"), onSelect: onDelete, danger: true },
              ]}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
