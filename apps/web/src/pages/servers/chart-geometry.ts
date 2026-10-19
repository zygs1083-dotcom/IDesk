export type PlotPoint = { ts: string; value: number };

export function segments(points: PlotPoint[], step: number): PlotPoint[][] {
  const groups: PlotPoint[][] = [];
  for (const point of points) {
    const group = groups.at(-1);
    const last = group?.at(-1);
    if (!group || !last || Date.parse(point.ts) - Date.parse(last.ts) > step * 2000) {
      groups.push([point]);
    } else {
      group.push(point);
    }
  }
  return groups;
}

export function linePath(points: { x: number; y: number }[], stepped: boolean): string {
  const [first, ...rest] = points;
  if (!first) return "";
  return `M${first.x},${first.y}${rest
    .map((point) => (stepped ? `H${point.x}V${point.y}` : `L${point.x},${point.y}`))
    .join("")}`;
}
