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
    const current = [...open].sort((a, b) => scores.get(a)! - scores.get(b)!)[0]!;
    if (current === goal.id) {
      const path = [points.get(current)!];
      let id = current;
      while (previous.has(id)) {
        id = previous.get(id)!;
        path.unshift(points.get(id)!);
      }
      return path.map(({ x, y }) => ({ x, y }));
    }
    open.delete(current);
    for (const [a, b] of scene.edges) {
      const next = a === current ? b : b === current ? a : undefined;
      if (!next) continue;
      const cost = costs.get(current)! + distance(points.get(current)!, points.get(next)!);
      if (cost >= (costs.get(next) ?? Number.POSITIVE_INFINITY)) continue;
      previous.set(next, current);
      costs.set(next, cost);
      scores.set(next, cost + distance(points.get(next)!, goal));
      open.add(next);
    }
  }
  return [];
}
