import type { OfficeLayout } from "@idesk/shared/office-layout";

export type Point = { x: number; y: number };
const CELL = 16;
const key = (point: Point) => `${point.x},${point.y}`;
export function walkableGrid(layout: OfficeLayout) {
  return layout.grid.rows.map((row) => [...row].map((cell) => cell === "."));
}

export function smoothCorners(path: Point[], walkable: (point: Point) => boolean): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[i] as Point;
    const b = path[i + 1];
    const c = path[i + 2];
    result.push(a);
    if (
      b &&
      c &&
      Math.abs(c.x - a.x) === 1 &&
      Math.abs(c.y - a.y) === 1 &&
      walkable({ x: a.x, y: c.y }) &&
      walkable({ x: c.x, y: a.y })
    )
      i++;
  }
  return result;
}

export function findPath(layout: OfficeLayout, start: Point, end: Point): Point[] {
  const grid = walkableGrid(layout);
  const inside = (p: Point) =>
    p.x >= 0 && p.y >= 0 && p.x < (grid[0] as boolean[]).length && p.y < grid.length;
  if (!inside(start) || !inside(end)) return [];
  const walkable = (p: Point) =>
    inside(p) &&
    (key(p) === key(start) || key(p) === key(end) || (grid[p.y] as boolean[])[p.x] === true);
  const distance = (p: Point) => Math.abs(p.x - end.x) + Math.abs(p.y - end.y);
  const open = [start];
  const costs = new Map([[key(start), 0]]);
  const previous = new Map<string, Point>();
  while (open.length) {
    open.sort(
      (a, b) => (costs.get(key(a)) ?? 0) + distance(a) - (costs.get(key(b)) ?? 0) - distance(b),
    );
    const current = open.shift() as Point;
    if (key(current) === key(end)) {
      const path = [current];
      let parent = previous.get(key(current));
      while (parent) {
        path.unshift(parent);
        parent = previous.get(key(parent));
      }
      return smoothCorners(path, walkable).map((point) => cellCenter({ x: point.x, y: point.y }));
    }
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ] as const) {
      const next = { x: current.x + dx, y: current.y + dy };
      const cost = (costs.get(key(current)) as number) + 1;
      if (!walkable(next) || cost >= (costs.get(key(next)) ?? Infinity)) continue;
      previous.set(key(next), current);
      costs.set(key(next), cost);
      if (!open.some((p) => key(p) === key(next))) open.push(next);
    }
  }
  return [];
}

export function cellCenter<T extends Point>(point: T): T {
  return { ...point, x: (point.x + 0.5) * CELL, y: (point.y + 0.5) * CELL };
}

export function cellOf(point: Point): Point {
  return { x: Math.floor(point.x / CELL), y: Math.floor(point.y / CELL) };
}
