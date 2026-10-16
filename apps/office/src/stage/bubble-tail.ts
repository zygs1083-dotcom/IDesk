import type { Point } from "../world/path.ts";
import type { BubbleRect } from "./bubble-layout.ts";
import { tailCollisionMargin, tailTerminalLength } from "./bubble-pointer.ts";

export type BubbleTail = [Point, Point, ...Point[]];

export function tailIntersectsRect(tail: BubbleTail, rect: BubbleRect) {
  let start = tail[0];
  for (const end of tail.slice(1)) {
    let low = 0;
    let high = 1;
    for (const [from, to, min, max] of [
      [start.x, end.x, rect.x - tailCollisionMargin, rect.x + rect.width + tailCollisionMargin],
      [start.y, end.y, rect.y - tailCollisionMargin, rect.y + rect.height + tailCollisionMargin],
    ] as const) {
      const delta = to - from;
      if (delta === 0) {
        if (from < min || from > max) high = -1;
      } else {
        const near = (min - from) / delta;
        const far = (max - from) / delta;
        low = Math.max(low, Math.min(near, far));
        high = Math.min(high, Math.max(near, far));
      }
    }
    if (low <= high) return true;
    start = end;
  }
  return false;
}

export function bubbleTail(
  rect: BubbleRect,
  anchor: Point,
  obstacles: BubbleRect[],
  canvas: { width: number; height: number },
): BubbleTail | undefined {
  const tip = { x: Math.round(anchor.x), y: Math.round(anchor.y) };
  const end = { x: tip.x, y: Math.max(1, tip.y - tailTerminalLength) };
  const side =
    end.x < rect.x ? rect.x : end.x > rect.x + rect.width ? rect.x + rect.width : undefined;
  const xs =
    side === undefined
      ? [
          Math.max(rect.x + 2, Math.min(rect.x + rect.width - 2, end.x)),
          rect.x + 2,
          rect.x + rect.width - 2,
        ]
      : [side];
  for (const x of xs) {
    const start = { x, y: rect.y + rect.height - (side === undefined ? 1 : 0) };
    const paths: BubbleTail[] = [[start, end, tip]];
    for (const y of [end.y - 4, ...obstacles.map((other) => other.y + other.height + 4)]) {
      if (y > start.y && y <= end.y) paths.push([start, { x, y }, end, tip]);
    }
    for (const path of paths) {
      if (
        path.every(
          (point) =>
            point.x >= 1 &&
            point.y >= 1 &&
            point.x <= canvas.width - 1 &&
            point.y <= canvas.height - 1,
        ) &&
        obstacles.every((other) => !tailIntersectsRect(path, other))
      )
        return path;
    }
  }
}
