import { afterEach, expect, test, vi } from "vitest";
import { easeInOut, setTimeScale, tween } from "./tween.ts";

const motion = vi.hoisted(() => {
  const media = { matches: false };
  vi.stubGlobal("matchMedia", () => media);
  return media;
});
afterEach(() => {
  motion.matches = false;
  setTimeScale(1);
});

function manualTicker() {
  const updates = new Set<(tick: { deltaMS: number }) => void>();
  return {
    add: (update: (tick: { deltaMS: number }) => void) => {
      updates.add(update);
    },
    remove: (update: (tick: { deltaMS: number }) => void) => {
      updates.delete(update);
    },
    advance: (deltaMS: number) => {
      for (const update of updates) update({ deltaMS });
    },
    updates,
  };
}

test("ticker time moves both coordinates and removes the completed tween", async () => {
  const ticker = manualTicker();
  const point = Object.create({ x: 10, y: 20 }) as { x: number; y: number };
  const finished = tween(ticker, point, { x: 110, y: 220 }, 1000);
  ticker.advance(500);
  expect(point).toEqual({ x: 60, y: 120 });
  ticker.advance(500);
  await finished;
  expect(point).toEqual({ x: 110, y: 220 });
  expect(ticker.updates.size).toBe(0);
});

test("easing endpoints and overshoot land exactly on the target", async () => {
  expect([easeInOut(0), easeInOut(0.5), easeInOut(1)]).toEqual([0, 0.5, 1]);
  const ticker = manualTicker();
  const point = { x: 0, y: 0 };
  const finished = tween(ticker, point, { x: 5, y: 9 }, 10);
  ticker.advance(20);
  await finished;
  expect(point).toEqual({ x: 5, y: 9 });
});

test("reduced motion reaches the destination without waiting for a tick", async () => {
  motion.matches = true;
  const ticker = manualTicker();
  const point = { x: 0, y: 0 };
  const finished = tween(ticker, point, { x: 100, y: 200 }, 5000);
  expect(point).toEqual({ x: 100, y: 200 });
  expect(ticker.updates.size).toBe(0);
  await finished;
  expect(point).toEqual({ x: 100, y: 200 });
  expect(ticker.updates.size).toBe(0);
});

test("time scale divides tween duration and infinity finishes without a tick", async () => {
  const ticker = manualTicker();
  const point = { x: 0, y: 0 };
  setTimeScale(10);
  const finished = tween(ticker, point, { x: 10, y: 20 }, 1000);
  ticker.advance(100);
  await finished;
  expect(point).toEqual({ x: 10, y: 20 });
  expect(ticker.updates.size).toBe(0);
  setTimeScale(Number.POSITIVE_INFINITY);
  await tween(ticker, point, { x: 30, y: 40 }, 1000);
  expect(point).toEqual({ x: 30, y: 40 });
  expect(ticker.updates.size).toBe(0);
});
