import type { ServerMetrics, ServerRange } from "../../lib/use-servers.ts";
import { type ChartSeries, TimeChart } from "./time-chart.tsx";

export function ChartPanel({
  title,
  metrics,
  range,
  series,
  max,
  unit,
  format,
  cpu = false,
}: {
  title: string;
  metrics: ServerMetrics;
  range: ServerRange;
  series: ChartSeries[];
  max: number;
  unit: string;
  format: (value: number) => string;
  cpu?: boolean;
}) {
  return (
    <section
      data-ui="server-panel"
      className="min-w-0 rounded-card border border-line bg-surface p-4 shadow-card"
    >
      <h2 className="mb-2 text-section">{title}</h2>
      <TimeChart
        points={metrics.points}
        range={range}
        step={metrics.step}
        series={series}
        max={max}
        unit={unit}
        format={format}
        cpu={cpu}
      />
      <div className="mt-2 flex flex-wrap gap-4 text-label text-text-2">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5">
            <i className={`server-legend server-legend-${item.color}`} />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}
