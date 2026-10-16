import type { Point } from "../world/path.ts";

export function headPosition(point: Point, toScreen: (point: Point) => Point) {
  return toScreen({ x: point.x, y: point.y - 104 });
}
