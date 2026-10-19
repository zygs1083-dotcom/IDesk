import type { ServerMetrics, ServerRange } from "../../lib/use-servers.ts";
import { type ChartSeries, TimeChart } from "./time-chart.tsx";

export function MetricCard({
  title,
  value,
  detail,
  usage,
  metrics,
  range,
  series,
  max,
  format,
}: {
  title: string;
  value: string;
  detail: string;
  usage?: number;
  metrics: ServerMetrics;
  range: ServerRange;
  series: ChartSeries[];
  max: number;
  format: (value: number) => string;
}) {
  return (
    <section
      data-ui="server-metric"
      className="min-w-0 rounded-card border border-line bg-surface p-4 shadow-card"
    >
      <h2 className="text-label font-medium text-text-2">{title}</h2>
      <strong className="mt-2 block truncate text-2xl font-semibold tabular-nums" title={value}>
        {value}
      </strong>
      <p className="mt-1 truncate text-label text-text-2" title={detail}>
        {detail}
      </p>
      {usage !== undefined && (
        <progress
          data-level={usage >= 90 ? "failed" : usage >= 80 ? "paused" : "normal"}
          className="server-progress mt-3"
          max={100}
          value={usage}
          aria-label={title}
        />
      )}
      <div className={usage === undefined ? "mt-6" : "mt-3"}>
        <TimeChart
          mini
          points={metrics.points}
          range={range}
          step={metrics.step}
          series={series}
          max={max}
          unit=""
          format={format}
        />
      </div>
    </section>
  );
}
