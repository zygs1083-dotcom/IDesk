import { seatApproaches } from "@idesk/shared/office-clearance";
import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { expect, test } from "vitest";
import raw from "../../public/layout.json";
import { cellOf } from "./path.ts";
import { chatSeats } from "./places.ts";
import { bodiesIntersect, stopAllowed } from "./stops.ts";

const layout = parseOfficeLayout(raw);
const entrances = seatApproaches(layout);
const destinations = [
  ...layout.spots,
  ...layout.standing,
  ...Object.values(layout.points),
  ...layout.seats.flatMap((seat) => chatSeats(seat, layout) ?? []),
];

test.each(destinations)("stop at ($x,$y) avoids all chair entrances and feet", (point) => {
  expect(stopAllowed(point, layout)).toBe(true);
  const cell = cellOf(point);
  expect(entrances.has(`${cell.x},${cell.y}`)).toBe(false);
  for (const seat of layout.seats)
    expect(Math.hypot(point.x - seat.x, point.y - seat.y)).toBeGreaterThanOrEqual(
      layout.grid.clearance * 2,
    );
});

test.each(layout.seats)(
  "$id: chat stays horizontal and its stopped bodies do not intersect",
  (seat) => {
    const pair = chatSeats(seat, layout);
    if (!pair) return;
    expect(pair[0].y).toBe(pair[1].y);
    expect(bodiesIntersect(pair[0], pair[1], layout.grid.silhouette)).toBe(false);
    const blocked = chatSeats(seat, layout, pair);
    for (const point of blocked ?? [])
      for (const person of pair)
        expect(bodiesIntersect(point, person, layout.grid.silhouette)).toBe(false);
  },
);

test("initial standing bodies do not intersect other standing people or seated colleagues", () => {
  for (const [index, point] of layout.standing.entries())
    for (const other of [...layout.standing.slice(index + 1), ...layout.seats])
      expect(bodiesIntersect(point, other, layout.grid.silhouette)).toBe(false);
});
