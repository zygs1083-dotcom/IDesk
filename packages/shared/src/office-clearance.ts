import type { OfficeLayout } from "./office-layout.ts";

type Occluder = OfficeLayout["occluders"][number];
type Point = { x: number; y: number };

export function floorBounds(item: Occluder) {
  const top = item.floorTop;
  const bottom = item.floorBottom ?? item.baseline;
  const xs: number[] = [];
  const polygonBottom = Math.max(...item.polygon.map((p) => p[1]));
  const low = Math.min(top, polygonBottom);
  const high = Math.min(bottom, polygonBottom);
  for (let i = 0; i < item.polygon.length; i++) {
    const [x, y] = item.polygon[i] as [number, number];
    const [nx, ny] = item.polygon[(i + 1) % item.polygon.length] as [number, number];
    if (y >= low && y <= high) xs.push(x);
    for (const edge of [low, high])
      if (y !== ny && edge >= Math.min(y, ny) && edge <= Math.max(y, ny))
        xs.push(x + ((nx - x) * (edge - y)) / (ny - y));
  }
  return { left: Math.min(...xs), right: Math.max(...xs), top, bottom };
}

export function inClearance(point: Point, layout: OfficeLayout) {
  return layout.occluders.some((item) => {
    const box = floorBounds(item);
    return (
      point.y >= box.top &&
      point.y <= box.bottom &&
      point.x >= box.left - layout.grid.clearance &&
      point.x <= box.right + layout.grid.clearance
    );
  });
}

export function departureStep(
  seat:
    | OfficeLayout["seats"][number]
    | (Point & {
        facing: OfficeLayout["seats"][number]["facing"] | "up";
        mirror?: boolean | undefined;
      }),
) {
  const steps = {
    front: { x: -1, y: -1 },
    back: { x: -1, y: 1 },
    down: { x: 0, y: -1 },
    up: { x: 0, y: 1 },
    left: { x: 1, y: 0 },
    right: { x: -1, y: 0 },
  };
  const step = steps[seat.facing];
  return { x: seat.mirror ? -step.x : step.x, y: step.y };
}

export function seatApproaches(layout: OfficeLayout, seats = layout.seats) {
  const cells = new Set<string>();
  for (const seat of seats) {
    const step = departureStep(seat);
    const x = Math.floor(seat.x / 16),
      y = Math.floor(seat.y / 16);
    cells.add(`${x},${y}`);
    if (!inClearance({ x: x * 16 + 8, y: y * 16 + 8 }, layout)) continue;
    for (let i = 1; i < Math.max(layout.grid.rows.length, layout.grid.rows[0]?.length ?? 0); i++) {
      const cx = x + step.x * i,
        cy = y + step.y * i;
      if (cx < 0 || cy < 0 || cx * 16 >= layout.size.w || cy * 16 >= layout.size.h) break;
      // A diagonal exit also opens its orthogonal neighbours so A* can reach the chair.
      const segment = [
        { x: cx, y: cy },
        { x: cx - step.x, y: cy },
        { x: cx, y: cy - step.y },
      ];
      for (const cell of segment) cells.add(`${cell.x},${cell.y}`);
      if (!inClearance({ x: cx * 16 + 8, y: cy * 16 + 8 }, layout)) break;
    }
  }
  return cells;
}
