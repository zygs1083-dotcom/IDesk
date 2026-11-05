import { useLang } from "../../i18n/lang.tsx";
import { relativeTime } from "../../lib/format.ts";
import type { Server, ServerMetrics, ServerRange } from "../../lib/use-servers.ts";
import { percent, rate } from "./format.ts";
import { TimeChart } from "./time-chart.tsx";

function level(usage: number) {
  return usage >= 90 ? "failed" : usage >= 80 ? "paused" : "normal";
}

function UsageRow({ label, usage, detail }: { label: string; usage: number; detail: string }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-label">
      <span className="text-text-2">{label}</span>
      <progress
        className="server-progress"
        data-level={level(usage)}
        max={100}
        value={usage}
        aria-label={label}
      />
      <span className="tabular-nums" title={detail}>
        {Math.round(usage)}%
      </span>
    </div>
  );
}

export function OverviewCard({
  server,
  metrics,
  range,
  now,
  onOpen,
}: {
  server: Server;
  metrics: ServerMetrics | undefined;
  range: ServerRange;
  now: number;
  onOpen: () => void;
}) {
  const { lang, t } = useLang();
  const latest = metrics?.latest;
  const elapsed = server.lastSeenAt
    ? Math.max(0, Math.floor((now - Date.parse(server.lastSeenAt)) / 1000))
    : 0;
  const status = !server.lastSeenAt
    ? t("servers.waiting")
    : server.status === "online"
      ? t("common.online")
      : `${t("common.offline")} · ${
          elapsed < 60
            ? t("servers.secondsAgo", { seconds: elapsed })
            : relativeTime(new Date(server.lastSeenAt), lang)
        }`;
  const diskUsed = latest?.disks.reduce((sum, disk) => sum + disk.used, 0) ?? 0;
  const diskTotal = latest?.disks.reduce((sum, disk) => sum + disk.total, 0) ?? 0;
  return (
    <button
      type="button"
      data-ui="server-overview-card"
      data-status={server.status}
      onClick={onOpen}
      className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4 text-left shadow-card transition-colors duration-hover ease-hover hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-section">
          <span data-ui="server-status-dot" data-status={server.status} aria-hidden="true" />
          <span className="truncate">{server.name}</span>
        </h2>
        <span
          data-ui="server-overview-status"
          className="shrink-0 text-label text-text-2"
          data-status={server.status}
        >
          {status}
        </span>
      </div>
      <p className="w-full truncate text-label text-text-2">
        {server.info
          ? `${server.info.hostname} · ${server.info.os} · ${server.info.cpuCount} ${t("servers.cores")}`
          : t("servers.installHint")}
      </p>
      {latest && metrics && (
        <>
          <div className="w-full space-y-2">
            <UsageRow
              label={t("servers.cpu")}
              usage={latest.cpu}
              detail={t("servers.load", {
                one: latest.load[0].toFixed(2),
                five: latest.load[1].toFixed(2),
                fifteen: latest.load[2].toFixed(2),
              })}
            />
            <UsageRow
              label={t("servers.memory")}
              usage={percent(latest.memUsed, latest.memTotal)}
              detail={`${(latest.memUsed / 2 ** 30).toFixed(1)} / ${(latest.memTotal / 2 ** 30).toFixed(1)} GiB`}
            />
            <UsageRow
              label={t("servers.disk")}
              usage={percent(diskUsed, diskTotal)}
              detail={`${(diskUsed / 2 ** 30).toFixed(1)} / ${(diskTotal / 2 ** 30).toFixed(1)} GiB`}
            />
            <div className="grid grid-cols-[3.5rem_1fr] items-center gap-2 text-label">
              <span className="text-text-2">{t("servers.network")}</span>
              <span className="truncate tabular-nums">
                ↓ {rate(latest.netRx)} · ↑ {rate(latest.netTx)}
              </span>
            </div>
          </div>
          <div className="w-full">
            <TimeChart
              mini
              points={metrics.points}
              range={range}
              step={metrics.step}
              series={[{ key: "cpu", label: t("servers.cpu"), color: 1 }]}
              max={100}
              unit=""
              format={(value) => `${Math.round(value)}%`}
            />
          </div>
        </>
      )}
    </button>
  );
}
