import { SERVER_RANGE_SECONDS } from "@idesk/shared/server-schemas";
import { useLang } from "../../i18n/lang.tsx";
import type { Server, ServerMetrics, ServerRange } from "../../lib/use-servers.ts";
import { ChartPanel } from "./chart-panel.tsx";
import { bytes, percent, rate, uptime } from "./format.ts";
import { MetricCard } from "./metric-card.tsx";

type Props = {
  info: NonNullable<Server["info"]>;
  latest: NonNullable<ServerMetrics["latest"]>;
  metrics: ServerMetrics;
  range: ServerRange;
};

export function ServerDashboard({ info, latest, metrics, range }: Props) {
  const { lang, t } = useLang();
  const diskUsed = latest.disks.reduce((sum, disk) => sum + disk.used, 0);
  const diskTotal = latest.disks.reduce((sum, disk) => sum + disk.total, 0);
  const cores = latest.cores.map((usage, index) => ({ label: String(index + 1), usage }));
  const cpuSeries = [{ key: "cpu", label: t("servers.cpu"), color: 1 }] as const;
  const memorySeries = [
    { key: "memUsed", label: t("servers.used"), color: 2 },
    { key: "swapUsed", label: t("servers.swap"), color: 3 },
  ] as const;
  const networkSeries = [
    { key: "netRx", label: t("servers.received"), color: 1 },
    { key: "netTx", label: t("servers.sent"), color: 2 },
  ] as const;
  const diskSeries = [{ key: "diskUsed", label: t("servers.disk"), color: 3 }] as const;
  const now = Date.now();
  const networkMax = Math.max(
    0,
    ...metrics.points
      .filter(
        (point) =>
          Date.parse(point.ts) >= now - SERVER_RANGE_SECONDS[range] * 1000 &&
          Date.parse(point.ts) <= now,
      )
      .map((point) => Math.max(point.netRx, point.netTx)),
  );
  return (
    <>
      <p
        data-ui="server-info"
        className="truncate text-xs text-text-2"
        title={`${info.hostname} · ${info.os} · ${info.kernel} · ${info.cpuModel} × ${info.cpuCount} · ${uptime(latest.uptime, lang)}`}
      >
        {info.hostname} · {info.os} · {info.kernel} · {info.cpuModel} × {info.cpuCount}{" "}
        {t("servers.cores")} · {t("servers.uptime", { duration: uptime(latest.uptime, lang) })}
      </p>
      <div data-ui="server-metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          title={t("servers.cpu")}
          value={`${Math.round(latest.cpu)}%`}
          detail={t("servers.load", {
            one: latest.load[0].toFixed(2),
            five: latest.load[1].toFixed(2),
            fifteen: latest.load[2].toFixed(2),
          })}
          usage={latest.cpu}
          metrics={metrics}
          range={range}
          series={[...cpuSeries]}
          max={100}
          format={(value) => `${Math.round(value)}%`}
        />
        <MetricCard
          title={t("servers.memory")}
          value={`${(latest.memUsed / 2 ** 30).toFixed(1)} / ${(latest.memTotal / 2 ** 30).toFixed(1)} GiB`}
          detail={`${percent(latest.memUsed, latest.memTotal)}% · ${t("servers.swap")} ${bytes(latest.swapUsed)}`}
          usage={percent(latest.memUsed, latest.memTotal)}
          metrics={metrics}
          range={range}
          series={[memorySeries[0]]}
          max={latest.memTotal || 1}
          format={bytes}
        />
        <MetricCard
          title={t("servers.disk")}
          value={`${(diskUsed / 2 ** 30).toFixed(1)} / ${(diskTotal / 2 ** 30).toFixed(1)} GiB`}
          detail={`${percent(diskUsed, diskTotal)}% · ${latest.disks.length} ${t("servers.partitions")}`}
          usage={percent(diskUsed, diskTotal)}
          metrics={metrics}
          range={range}
          series={[...diskSeries]}
          max={diskTotal || 1}
          format={bytes}
        />
        <MetricCard
          title={t("servers.network")}
          value={`↓ ${rate(latest.netRx)}`}
          detail={`↑ ${rate(latest.netTx)}`}
          metrics={metrics}
          range={range}
          series={[...networkSeries]}
          max={networkMax}
          format={rate}
        />
      </div>
      <div data-ui="server-charts" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartPanel
          title={t("servers.cpuUsage")}
          metrics={metrics}
          range={range}
          series={[...cpuSeries]}
          max={100}
          unit="%"
          format={(value) => `${Math.round(value)}%`}
          cpu
        />
        <ChartPanel
          title={t("servers.memory")}
          metrics={metrics}
          range={range}
          series={[...memorySeries]}
          max={latest.memTotal || 1}
          unit="bytes"
          format={bytes}
        />
        <ChartPanel
          title={t("servers.network")}
          metrics={metrics}
          range={range}
          series={[...networkSeries]}
          max={networkMax}
          unit="rate"
          format={rate}
        />
        <section
          data-ui="server-panel"
          className="min-w-0 rounded-card border border-line bg-surface p-4 shadow-card"
        >
          <h2 className="mb-4 text-section">{t("servers.coresDisks")}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-label text-text-2">{t("servers.cores")}</h3>
              <div className="flex h-32 items-end gap-1 border-b border-line pb-1">
                {cores.map(({ label, usage }) => (
                  <div
                    key={label}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  >
                    <svg
                      className="h-24 w-full max-w-5 bg-surface-2"
                      viewBox="0 0 20 100"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`${t("servers.cpu")} ${label}: ${Math.round(usage)}%`}
                    >
                      <rect
                        className="server-core"
                        data-level={usage >= 90 ? "failed" : usage >= 80 ? "paused" : "normal"}
                        x="0"
                        y={100 - Math.max(1, usage)}
                        width="20"
                        height={Math.max(1, usage)}
                      />
                    </svg>
                    <span className="text-[10px] text-text-2">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-label text-text-2">{t("servers.partitions")}</h3>
              <div className="space-y-3">
                {latest.disks.map((disk) => (
                  <div key={disk.mount}>
                    <div className="mb-1 flex justify-between gap-2 text-label">
                      <span className="truncate" title={disk.mount}>
                        {disk.mount}
                      </span>
                      <span className="shrink-0 tabular-nums text-text-2">
                        {percent(disk.used, disk.total)}%
                      </span>
                    </div>
                    <progress
                      className="server-progress"
                      data-level={
                        percent(disk.used, disk.total) >= 90
                          ? "failed"
                          : percent(disk.used, disk.total) >= 80
                            ? "paused"
                            : "normal"
                      }
                      value={disk.used}
                      max={disk.total || 1}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
