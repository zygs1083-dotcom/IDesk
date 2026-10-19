import type { ServerMetrics, ServerRange } from "../../lib/use-servers.ts";
import { tooltipTime } from "./format.ts";
import type { ChartSeries } from "./time-chart.tsx";

export function ChartTooltip({
  point,
  series,
  format,
  range,
}: {
  point: ServerMetrics["points"][number];
  series: ChartSeries[];
  format: (value: number) => string;
  range: ServerRange;
}) {
  return (
    <div
      data-ui="chart-tooltip"
      role="status"
      className="absolute right-2 top-2 rounded-pop border border-line bg-surface px-3 py-2 text-label shadow-pop"
    >
      <strong>{tooltipTime(new Date(point.ts), range)}</strong>
      {series.map((item) => (
        <div key={item.key} className="flex justify-between gap-4">
          <span>{item.label}</span>
          <span className="tabular-nums">{format(point[item.key])}</span>
        </div>
      ))}
    </div>
  );
}
