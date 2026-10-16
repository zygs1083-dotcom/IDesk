import { inClearance, seatApproaches } from "@idesk/shared/office-clearance";
import type { OfficeLayout } from "@idesk/shared/office-layout";
import { cellOf, type Point } from "./path.ts";

export function bodiesIntersect(a: Point, b: Point, body: OfficeLayout["grid"]["silhouette"]) {
  return (
    a.x + body.left < b.x + body.right &&
    a.x + body.right > b.x + body.left &&
    a.y + body.top < b.y + body.bottom &&
    a.y + body.bottom > b.y + body.top
  );
}

export function stopAllowed(
  point: Point,
  layout: OfficeLayout,
  entrances = seatApproaches(layout),
) {
  const cell = cellOf(point);
  return (
    layout.grid.rows[cell.y]?.[cell.x] === "." &&
    !inClearance(point, layout) &&
    !entrances.has(`${cell.x},${cell.y}`) &&
    layout.seats.every(
      (seat) => Math.hypot(point.x - seat.x, point.y - seat.y) >= layout.grid.clearance * 2,
    )
  );
}

export function nearestStop<T extends Point>(
  target: T,
  occupied: Point[],
  layout: OfficeLayout,
): T | undefined {
  const entrances = seatApproaches(layout);
  const clear = (point: Point) =>
    stopAllowed(point, layout, entrances) &&
    occupied.every((person) => !bodiesIntersect(point, person, layout.grid.silhouette));
  if (clear(target)) return target;
  const points = layout.grid.rows.flatMap((row, y) =>
    [...row].flatMap((cell, x) =>
      cell === "." ? [{ ...target, x: x * 16 + 8, y: y * 16 + 8 }] : [],
    ),
  );
  points.sort(
    (a, b) =>
      Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y),
  );
  return points.find(clear);
}
