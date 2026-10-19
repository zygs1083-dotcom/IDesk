import { SERVER_RANGE_SECONDS } from "@idesk/shared/server-schemas";
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from "react";
import type { ServerMetrics, ServerRange } from "../../lib/use-servers.ts";
import { linePath, segments } from "./chart-geometry.ts";
import { ChartTooltip } from "./chart-tooltip.tsx";
import { axisTime, byteAxis, timeTicks } from "./format.ts";

type Point = ServerMetrics["points"][number];
export type ChartSeries = {
  key: keyof Pick<Point, "cpu" | "memUsed" | "swapUsed" | "netRx" | "netTx" | "diskUsed">;
  label: string;
  color: 1 | 2 | 3;
};
type Props = {
  points: Point[];
  range: ServerRange;
  step: number;
  series: ChartSeries[];
  max: number;
  unit: string;
  format: (value: number) => string;
  mini?: boolean;
  cpu?: boolean;
};

export function TimeChart(props: Props) {
  const { points, range, step, series, max, unit, format, mini = false, cpu = false } = props;
  const [active, setActive] = useState<number | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const gradientId = useId();
  useEffect(() => {
    if (mini || !container.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setMeasuredWidth(entry.contentRect.width);
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [mini]);
  const width = mini ? 100 : measuredWidth;
  const height = mini ? 22 : 190;
  const left = mini ? 0 : unit === "rate" ? 82 : unit === "bytes" ? 64 : 49;
  const right = mini ? 0 : 8;
  const top = mini ? 1 : 12;
  const bottom = mini ? 1 : 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const axis = !mini && unit !== "%" ? byteAxis(max, unit === "rate") : null;
  const chartMax = mini ? Math.max(1, max) : (axis?.max ?? 100);
  const ticks =
    unit === "%"
      ? [0, 25, 50, 75, 100].map((value) => ({ value, label: `${value}%` }))
      : (axis?.ticks ?? []);
  const end = Date.now();
  const start = end - SERVER_RANGE_SECONDS[range] * 1000;
  const x = (ts: string) =>
    left + Math.max(0, Math.min(1, (Date.parse(ts) - start) / (end - start))) * plotWidth;
  const y = (value: number) => top + (1 - Math.min(value / chartMax, 1)) * plotHeight;
  const visible = points.filter(
    (point) => Date.parse(point.ts) >= start && Date.parse(point.ts) <= end,
  );
  const selected = active === null ? null : visible[active];
  const times = mini ? [] : timeTicks(start, end, range, plotWidth < 400);

  function pointAt(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const target = start + ((event.clientX - rect.left - left) / plotWidth) * (end - start);
    let closest = 0;
    let distance = Infinity;
    for (const [index, point] of visible.entries()) {
      const next = Math.abs(Date.parse(point.ts) - target);
      if (next < distance) {
        closest = index;
        distance = next;
      }
    }
    setActive(visible.length ? closest : null);
  }

  function moveActive(event: KeyboardEvent<SVGSVGElement>) {
    const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    setActive(
      Math.max(0, Math.min(visible.length - 1, (active ?? visible.length - 1) + direction)),
    );
  }

  return (
    <div
      ref={container}
      data-ui={mini ? "server-spark" : "server-chart"}
      className="relative min-w-0"
    >
      {(mini || width > 0) && (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio={mini ? "none" : undefined}
          role="img"
          aria-label={series.map((item) => item.label).join(", ")}
          tabIndex={mini ? -1 : 0}
          onPointerLeave={() => setActive(null)}
          onPointerMove={mini ? undefined : pointAt}
          onKeyDown={mini ? undefined : moveActive}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity=".16" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {!mini && (
            <>
              {ticks.map((tick) => {
                const position = y(tick.value);
                return (
                  <g key={tick.value}>
                    <line
                      data-ui="chart-grid"
                      x1={left}
                      y1={position}
                      x2={width - right}
                      y2={position}
                    />
                    <text x={left - 7} y={position + 4} textAnchor="end" className="server-axis">
                      {tick.label}
                    </text>
                  </g>
                );
              })}
              {times.map((date) => {
                const position = x(date.toISOString());
                return position >= 18 && position <= width - 18 ? (
                  <text
                    key={date.toISOString()}
                    x={position}
                    y={height - 5}
                    textAnchor="middle"
                    className="server-axis"
                  >
                    {axisTime(date, range)}
                  </text>
                ) : null;
              })}
            </>
          )}
          {series.map((item) =>
            segments(
              visible.map((point) => ({ ts: point.ts, value: point[item.key] })),
              step,
            ).map((group) => {
              const coordinates = group.map((point) => ({ x: x(point.ts), y: y(point.value) }));
              const first = coordinates[0];
              const last = coordinates.at(-1);
              const path = linePath(coordinates, false);
              const stepped = linePath(coordinates, true);
              return (
                <g key={`${item.key}-${group[0]?.ts}`} data-series={item.color}>
                  {cpu && !mini && first && last && (
                    <path
                      className="server-area"
                      d={`${path}L${last.x},${top + plotHeight}L${first.x},${top + plotHeight}Z`}
                      fill={`url(#${gradientId})`}
                    />
                  )}
                  <path className="server-line" d={path} />
                  <path className="server-step" d={stepped} />
                  {cpu &&
                    !mini &&
                    group.map((point) => (
                      <rect
                        key={point.ts}
                        className="server-bar"
                        x={x(point.ts)}
                        y={y(point.value)}
                        width={Math.max(1, (plotWidth * step) / SERVER_RANGE_SECONDS[range] - 1)}
                        height={top + plotHeight - y(point.value)}
                      />
                    ))}
                </g>
              );
            }),
          )}
          {selected && !mini && (
            <line
              data-ui="chart-cursor"
              x1={x(selected.ts)}
              x2={x(selected.ts)}
              y1={top}
              y2={top + plotHeight}
            />
          )}
        </svg>
      )}
      {selected && !mini && (
        <ChartTooltip point={selected} series={series} format={format} range={range} />
      )}
    </div>
  );
}
