import { contains } from "@idesk/shared/office-geometry";
import type { OfficeLayout } from "@idesk/shared/office-layout";
import { cellCenter, cellOf, type Point, walkableGrid } from "./path.ts";

export type Seat = OfficeLayout["seats"][number];
export type Direction = Seat["facing"] | "up";
export type Target = Point & { facing: Direction; mirror?: boolean | undefined };
export type Spot = OfficeLayout["spots"][number];
export type SpotId = Spot["id"];
export type Standing = Target & { id: string; zone?: string | undefined };

export function assignSeats(agents: { id: string; host: string }[], layout: OfficeLayout) {
  const hosts = [...new Set(agents.map((agent) => agent.host))].filter(
    (host) => layout.hostZones[host] === undefined,
  );
  const occupied = layout.zones.map(() => 0);
  const assignments = new Map<string, Seat>();
  for (const agent of agents) {
    const fixed = layout.hostZones[agent.host];
    const preferred =
      fixed === undefined
        ? hosts.indexOf(agent.host) % layout.zones.length
        : layout.zones.findIndex((zone) => zone.id === fixed);
    for (let offset = 0; offset < layout.zones.length; offset++) {
      const index = (preferred + offset) % layout.zones.length;
      const zone = layout.zones[index];
      const count = occupied[index];
      if (!zone || count === undefined) continue;
      const seat = layout.seats.find((seat) => seat.id === zone.seats[count]);
      if (seat) {
        assignments.set(agent.id, seat);
        occupied[index] = count + 1;
        break;
      }
    }
  }
  return assignments;
}

export function assignStanding(
  agents: { id: string }[],
  seated: ReadonlyMap<string, Target>,
  layout: OfficeLayout,
) {
  const assignments = new Map<string, Standing>();
  for (const agent of agents) {
    if (seated.has(agent.id)) continue;
    const point = layout.standing[assignments.size];
    if (!point) break;
    assignments.set(agent.id, { id: `standing-${assignments.size}`, ...point });
  }
  return assignments;
}

export function workSpot(point: Point, fallbackY: number, layout: OfficeLayout) {
  const occluder = layout.occluders.find((item) => contains(item.polygon, point.x, point.y));
  return { ...point, sortY: occluder ? occluder.baseline : fallbackY };
}

export function coffeeSeats(layout: OfficeLayout): Target[] {
  return [
    ...layout.lounge.map((id) => layout.seats.find((seat) => seat.id === id) as Seat),
    ...layout.spots.filter((spot) => spot.id === "coffee"),
  ];
}

export function departure(seat: Target, layout: OfficeLayout) {
  const cell = cellOf(seat);
  // front faces lower-right; back faces upper-right. Depart in the opposite diagonal.
  const steps: Record<Direction, Point> = {
    front: { x: -1, y: -1 },
    back: { x: -1, y: 1 },
    down: { x: 0, y: -1 },
    up: { x: 0, y: 1 },
    left: { x: 1, y: 0 },
    right: { x: -1, y: 0 },
  };
  const step = steps[seat.facing];
  const dx = seat.mirror ? -step.x : step.x;
  const grid = walkableGrid(layout);
  for (let i = 1; i < Math.max(grid.length, (grid[0] as boolean[]).length); i++) {
    const point = { x: cell.x + dx * i, y: cell.y + step.y * i };
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= (grid[0] as boolean[]).length ||
      point.y >= grid.length
    )
      return;
    if (grid[point.y]?.[point.x]) return point;
  }
}

export function chatSeats(seat: Target, layout: OfficeLayout): [Target, Target] | undefined {
  const center = departure(seat, layout);
  if (!center) return;
  const grid = walkableGrid(layout);
  for (const [a, b, facingA, facingB] of [
    [{ x: center.x - 1, y: center.y }, { x: center.x + 1, y: center.y }, "right", "left"],
    [{ x: center.x, y: center.y - 1 }, { x: center.x, y: center.y + 1 }, "down", "up"],
  ] as const) {
    if (grid[a.y]?.[a.x] && grid[b.y]?.[b.x])
      return [cellCenter({ ...a, facing: facingA }), cellCenter({ ...b, facing: facingB })];
  }
}
