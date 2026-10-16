import type { Point } from "../world/path.ts";

export const tailWidth = 3;
export const tailOutline = 1;
export const tailTerminalLength = 8;
export const tailCollisionMargin = 1;
export const tailHeadGap = Math.ceil(
  tailTerminalLength + tailWidth / 2 + tailOutline + tailCollisionMargin,
);

export function bubblePointer(tip: Point): [Point, Point, Point] {
  const scale = Math.min(1, tip.y / 5, tip.x / 4);
  return [
    { x: tip.x - 3 * scale, y: tip.y - 4 * scale },
    { x: tip.x + 3 * scale, y: tip.y - 4 * scale },
    tip,
  ];
}
