import type { Point } from "../scene/scene.ts";

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let timeScale = 1;

export function setTimeScale(scale: number) {
  timeScale = scale;
}

export const easeInOut = (t: number) => t * t * (3 - 2 * t);

export function tween(
  ticker: {
    add: (update: (tick: { deltaMS: number }) => void) => void;
    remove: (update: (tick: { deltaMS: number }) => void) => void;
  },
  from: Point,
  to: Point,
  ms: number,
  ease = easeInOut,
): Promise<void> {
  ms /= timeScale;
  if (reducedMotion.matches || ms === 0) {
    from.x = to.x;
    from.y = to.y;
    return Promise.resolve();
  }
  const start = { x: from.x, y: from.y };
  return new Promise((resolve) => {
    let elapsed = 0;
    const update = (tick: { deltaMS: number }) => {
      elapsed += tick.deltaMS;
      const progress = Math.min(elapsed / ms, 1);
      const t = ease(progress);
      from.x = start.x + (to.x - start.x) * t;
      from.y = start.y + (to.y - start.y) * t;
      if (progress === 1) {
        ticker.remove(update);
        resolve();
      }
    };
    ticker.add(update);
  });
}
