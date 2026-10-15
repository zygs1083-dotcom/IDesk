import { type Catalog, type Layout, TILE } from "@idesk/shared/office-schemas";
import { cellCenter, cellOf, type Point, walkableGrid } from "./path.ts";
import { type Direction, type Seat, seats, type Target } from "./seats.ts";

const steps: Record<Direction, Point> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function assignSeats(
  agents: { id: string; host: string }[],
  layout: Layout,
  catalog: Catalog,
) {
  const available = seats(layout, catalog);
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
      const seat = available.find((seat) => seat.id === zone.chairs[count]);
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
  seated: Map<string, Seat>,
  layout: Layout,
) {
  const assignments = new Map<string, Seat>();
  for (const agent of agents) {
    if (seated.has(agent.id)) continue;
    const point = layout.standing[assignments.size];
    if (!point) break;
    assignments.set(agent.id, {
      id: `standing-${assignments.size}`,
      zone: undefined,
      ...cellCenter(point),
    });
  }
  return assignments;
}

export function deskFor(seat: Target, layout: Layout, catalog: Catalog) {
  const cell = cellOf(seat);
  const step = steps[seat.facing];
  const x = cell.x + step.x;
  const y = cell.y + step.y;
  const object = layout.objects.find((object) => {
    const item = catalog.items[object.item];
    return (
      item?.workSpot &&
      x >= object.x &&
      x < object.x + item.footprint.w &&
      y >= object.y &&
      y < object.y + item.footprint.h
    );
  });
  return object ? workSpot(object.id, layout, catalog) : undefined;
}

export function workSpot(id: string, layout: Layout, catalog: Catalog) {
  const object = layout.objects.find((object) => object.id === id);
  if (!object) throw new Error(`Missing object: ${id}`);
  const item = catalog.items[object.item];
  if (!item?.workSpot) throw new Error(`Missing workSpot: ${id}`);
  return {
    x: object.x * TILE + item.workSpot.x,
    y: object.y * TILE + item.workSpot.y,
    sortY: object.y * TILE + Math.max(...item.parts.map((part) => part.sortY)),
  };
}

export function spriteCenter(
  id: string,
  layout: Layout,
  catalog: Catalog,
  frames: Record<string, { width: number; height: number }>,
) {
  const object = layout.objects.find((object) => object.id === id);
  if (!object) throw new Error(`Missing object: ${id}`);
  const part = catalog.items[object.item]?.parts[0];
  if (!part) throw new Error(`Missing part: ${id}`);
  const frame = frames[part.frame];
  if (!frame) throw new Error(`Missing frame: ${part.frame}`);
  return {
    x: object.x * TILE + part.dx + frame.width / 2,
    y: object.y * TILE + part.dy + frame.height / 2,
  };
}

export function coffeeSeats(layout: Layout, catalog: Catalog): Target[] {
  const available = seats(layout, catalog);
  return [
    ...layout.lounge.map((id) => available.find((seat) => seat.id === id) as Seat),
    ...[layout.points.sofaStand, layout.spots.find((spot) => spot.id === "coffee")]
      .filter((point) => point !== undefined)
      .map(cellCenter),
  ];
}

export function departure(seat: Target, layout: Layout, catalog: Catalog) {
  const cell = cellOf(seat);
  const step = steps[seat.facing];
  const grid = walkableGrid(layout, catalog);
  for (let i = 1; i < Math.max(layout.size.w, layout.size.h); i++) {
    const point = { x: cell.x - step.x * i, y: cell.y - step.y * i };
    if (point.x < 0 || point.y < 0 || point.x >= layout.size.w || point.y >= layout.size.h) return;
    if (grid[point.y]?.[point.x]) return point;
  }
}

export function chatSeats(
  seat: Target,
  layout: Layout,
  catalog: Catalog,
): [Target, Target] | undefined {
  const center = departure(seat, layout, catalog);
  if (!center) return;
  const grid = walkableGrid(layout, catalog);
  for (const [a, b, facingA, facingB] of [
    [{ x: center.x - 1, y: center.y }, { x: center.x + 1, y: center.y }, "right", "left"],
    [{ x: center.x, y: center.y - 1 }, { x: center.x, y: center.y + 1 }, "down", "up"],
  ] as const) {
    if (grid[a.y]?.[a.x] && grid[b.y]?.[b.x])
      return [cellCenter({ ...a, facing: facingA }), cellCenter({ ...b, facing: facingB })];
  }
}
