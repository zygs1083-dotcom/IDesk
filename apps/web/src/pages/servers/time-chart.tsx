import { SERVER_RANGE_SECONDS } from "@idesk/shared/server-schemas";
import { useId, useState } from "react";
import type { ServerMetrics, ServerRange } from "../../lib/use-servers.ts";
import { linePath, segments } from "./chart-geometry.ts";
import { ChartTooltip } from "./chart-tooltip.tsx";

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

export function TimeChart({
  points,
  range,
  step,
  series,
  max,
  unit,
  format,
  mini = false,
  cpu = false,
}: Props) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();
  const width = mini ? 100 : 600;
  const height = mini ? 22 : 200;
  const left = mini ? 0 : unit === "rate" ? 82 : unit === "bytes" ? 64 : 49;
  const right = mini ? 0 : 8;
  const top = mini ? 1 : 12;
  const bottom = mini ? 1 : 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const end = Date.now();
  const start = end - SERVER_RANGE_SECONDS[range] * 1000;
  const x = (ts: string) =>
    left + Math.max(0, Math.min(1, (Date.parse(ts) - start) / (end - start))) * plotWidth;
  const y = (value: number) => top + (1 - Math.min(value / max, 1)) * plotHeight;
  const visible = points.filter(
    (point) => Date.parse(point.ts) >= start && Date.parse(point.ts) <= end,
  );
  const selected = active === null ? null : visible[active];
  const ticks = [0, 1, 2, 3, 4];
  const times = [0, 1, 2, 3, 4].map((index) => new Date(start + ((end - start) * index) / 4));
  const timeLabel = (date: Date) =>
    range === "7d"
      ? `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  function pointAt(clientX: number, rect: DOMRect) {
    const target =
      start +
      (((clientX - rect.left) / rect.width - left / width) * (end - start) * width) / plotWidth;
    const closest = visible.reduce<{ index: number; distance: number } | null>(
      (best, point, index) => {
        const distance = Math.abs(Date.parse(point.ts) - target);
        return !best || distance < best.distance ? { index, distance } : best;
      },
      null,
    );
    setActive(closest?.index ?? null);
  }

  return (
    <div data-ui={mini ? "server-spark" : "server-chart"} className="relative min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={series.map((item) => item.label).join(", ")}
        tabIndex={mini ? -1 : 0}
        onPointerLeave={() => setActive(null)}
        onPointerMove={
          mini
            ? undefined
            : (event) => pointAt(event.clientX, event.currentTarget.getBoundingClientRect())
        }
        onKeyDown={
          mini
            ? undefined
            : (event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  setActive(
                    Math.max(
                      0,
                      Math.min(
                        visible.length - 1,
                        (active ?? visible.length - 1) + (event.key === "ArrowLeft" ? -1 : 1),
                      ),
                    ),
                  );
                }
              }
        }
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
              const value = (max * (4 - tick)) / 4;
              const position = top + (tick * plotHeight) / 4;
              return (
                <g key={tick}>
                  <line
                    data-ui="chart-grid"
                    x1={left}
                    y1={position}
                    x2={width - right}
                    y2={position}
                  />
                  <text x={left - 7} y={position + 4} textAnchor="end" className="server-axis">
                    {unit === "%" ? `${Math.round(value)}%` : format(value)}
                  </text>
                </g>
              );
            })}
            {times.map((date, index) => (
              <text
                key={date.toISOString()}
                x={left + (index * plotWidth) / 4}
                y={height - 5}
                textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"}
                className="server-axis"
              >
                {timeLabel(date)}
              </text>
            ))}
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
      {selected && !mini && <ChartTooltip point={selected} series={series} format={format} />}
    </div>
  );
}
