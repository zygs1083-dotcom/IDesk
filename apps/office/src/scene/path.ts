import type { Point, Scene } from "./scene.ts";

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function findPath(scene: Scene, fromWaypointId: string, toWaypointId: string): Point[] {
  const points = new Map(scene.waypoints.map((point) => [point.id, point]));
  const start = points.get(fromWaypointId);
  const goal = points.get(toWaypointId);
  if (!start || !goal) return [];
  const open = new Set([start.id]);
  const costs = new Map([[start.id, 0]]);
  const scores = new Map([[start.id, distance(start, goal)]]);
  const previous = new Map<string, string>();
  while (open.size) {
    const current = [...open].sort(
      (a, b) => (scores.get(a) ?? Infinity) - (scores.get(b) ?? Infinity),
    )[0];
    if (!current) return [];
    const point = points.get(current);
    const currentCost = costs.get(current);
    if (!point || currentCost === undefined) return [];
    if (current === goal.id) {
      const path = [point];
      let id = previous.get(current);
      while (id !== undefined) {
        const parent = points.get(id);
        if (!parent) return [];
        path.unshift(parent);
        id = previous.get(id);
      }
      return path.map(({ x, y }) => ({ x, y }));
    }
    open.delete(current);
    for (const [a, b] of scene.edges) {
      const next = a === current ? b : b === current ? a : undefined;
      if (!next) continue;
      const neighbor = points.get(next);
      if (!neighbor) continue;
      const cost = currentCost + distance(point, neighbor);
      if (cost >= (costs.get(next) ?? Infinity)) continue;
      previous.set(next, current);
      costs.set(next, cost);
      scores.set(next, cost + distance(neighbor, goal));
      open.add(next);
    }
  }
  return [];
}
