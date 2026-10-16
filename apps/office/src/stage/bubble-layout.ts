import type { Point } from "../world/path.ts";

export type BubbleRect = { x: number; y: number; width: number; height: number };
export type BubblePlacement = {
  id: number;
  anchor: Point;
  rect: BubbleRect;
  tail: [Point, Point];
  truncated: boolean;
  deferred: boolean;
};
export type BubbleInput = {
  id: number;
  anchor: Point;
  width: number;
  height: number;
  compact: { width: number; height: number };
};

const gap = 4;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function bubblesIntersect(a: BubbleRect, b: BubbleRect) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function layoutBubbles(
  inputs: BubbleInput[],
  canvas: { width: number; height: number },
  previous: BubblePlacement[] = [],
): BubblePlacement[] {
  const occupied: BubbleRect[] = [];
  const old = new Map(previous.map((item) => [item.id, item]));
  const ordered = [...inputs].sort(
    (a, b) =>
      Number(old.get(b.id)?.deferred === false) - Number(old.get(a.id)?.deferred === false) ||
      a.id - b.id,
  );
  return ordered.map((input) => {
    const prior = old.get(input.id);
    const truncated = prior?.truncated ?? false;
    const { width, height } = truncated ? input.compact : input;
    const { anchor } = input;
    const inside = (rect: BubbleRect) =>
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.x + rect.width <= canvas.width &&
      rect.y + rect.height <= canvas.height;
    const free = (rect: BubbleRect) =>
      inside(rect) &&
      (rect.y + rect.height <= anchor.y ||
        rect.x >= anchor.x + 1 ||
        rect.x + rect.width <= anchor.x - 1) &&
      occupied.every((other) => !bubblesIntersect(rect, other));
    const home = {
      x: clamp(Math.round(anchor.x - width / 2), 0, canvas.width - width),
      y: Math.round(anchor.y - height - 8),
      width,
      height,
    };
    let rect: BubbleRect | undefined;
    if (prior && !prior.deferred) {
      const moved = {
        ...prior.rect,
        x: prior.rect.x + Math.round(anchor.x) - Math.round(prior.anchor.x),
        y: prior.rect.y + Math.round(anchor.y) - Math.round(prior.anchor.y),
      };
      if (free(moved)) rect = moved;
    }
    const levels = [home.y, ...occupied.map((other) => other.y - height - gap)].sort(
      (a, b) => b - a,
    );
    for (const y of levels.filter((value) => value <= home.y)) {
      const candidate = { ...home, y };
      if (!rect && free(candidate)) rect = candidate;
    }
    const xs = [
      ...(home.y >= 0 ? [home.x] : []),
      anchor.x - width - gap,
      anchor.x + gap,
      0,
      canvas.width - width,
      ...occupied.flatMap((other) => [other.x - width - gap, other.x + other.width + gap]),
    ].sort((a, b) => Math.abs(a - home.x) - Math.abs(b - home.x));
    const ys = [clamp(home.y, 0, canvas.height - height), ...levels.filter((y) => y >= 0)];
    for (const x of xs) {
      for (const y of ys) {
        const candidate = { ...home, x, y };
        if (!rect && free(candidate)) rect = candidate;
      }
    }
    const anchorInside =
      anchor.x >= 1 &&
      anchor.x <= canvas.width - 1 &&
      anchor.y >= 1 &&
      anchor.y <= canvas.height - 1;
    const deferred = !rect || !anchorInside;
    const placed = rect ?? home;
    if (!deferred) occupied.push(placed);
    return {
      id: input.id,
      anchor: { ...anchor },
      rect: placed,
      tail: [
        { x: clamp(anchor.x, placed.x + 2, placed.x + width - 2), y: placed.y + height - 1 },
        { x: Math.round(anchor.x), y: Math.round(anchor.y) },
      ],
      truncated: truncated || deferred,
      deferred,
    };
  });
}
