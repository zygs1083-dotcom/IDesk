import { Menu } from "../../components/menu.tsx";
import { Switch } from "../../components/switch.tsx";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import { cronText } from "./cron-text.ts";
import type { Connector, Schedule } from "./types.ts";

export function ScheduleRow({
  schedule,
  connectors,
  busy,
  onToggle,
  onRun,
  onEdit,
  onDelete,
}: {
  schedule: Schedule;
  connectors: Connector[];
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const action = schedule.action;
  let summary: string;
  switch (action.type) {
    case "publish_task":
      summary = `发布『${action.template.title}』`;
      break;
    case "http": {
      const url = new URL(action.url);
      summary = `${action.method} ${url.host}${url.pathname}`;
      break;
    }
    case "connector_trigger":
      summary = `触发 ${connectors.find((connector) => connector.id === action.connectorId)?.name ?? action.connectorId} / ${action.jobExternalId}`;
      break;
  }
  const next = schedule.enabled && schedule.nextRunAt ? new Date(schedule.nextRunAt) : null;
  const nextText = next
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: schedule.timezone,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .format(next)
        .replaceAll("/", "-")
    : "—";
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
        {cronText(schedule.cron)}
      </td>
      <td className="px-4 py-3 text-text-2">
        <span className="block max-w-64 truncate" title={summary}>
          {summary}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-text-2">
        <span className="flex items-center gap-2">
          {schedule.lastStatus && (
            <span
              title={schedule.lastStatus === "success" ? "成功" : "失败"}
              className={cn(
                "size-2 shrink-0 rounded-full",
                schedule.lastStatus === "success" ? "bg-status-done" : "bg-status-failed",
              )}
            />
          )}
          {schedule.lastRunAt ? relativeTime(new Date(schedule.lastRunAt)) : "—"}
        </span>
      </td>
      <td
        className="whitespace-nowrap px-4 py-3 tabular-nums text-text-2"
        title={schedule.timezone}
      >
        {nextText}
      </td>
      <td className="px-4 py-3">
        <Switch
          label={`启用 ${schedule.name}`}
          checked={schedule.enabled}
          disabled={busy}
          onChange={onToggle}
        />
      </td>
      <td className="px-2 py-2">
        <Menu
          label={`${schedule.name} 操作`}
          disabled={busy}
          items={[
            { label: "立即运行", onSelect: onRun },
            { label: "编辑", onSelect: onEdit },
            { label: "删除", onSelect: onDelete, danger: true },
          ]}
        />
      </td>
    </tr>
  );
}
