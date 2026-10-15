import type { Direction, Point, Seat } from "../scene/scene.ts";

const DESK_OFFSETS: Record<Direction, Point> = {
  down: { x: 0, y: -7 },
  up: { x: 40, y: -55 },
  left: { x: -35, y: 25 },
  right: { x: 35, y: 25 },
};

export function deskPoint(seat: Seat): Point {
  const offset = DESK_OFFSETS[seat.facing];
  return { x: seat.x + offset.x, y: seat.y + offset.y };
}
