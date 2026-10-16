import { assert, expect, test } from "vitest";
import { BubbleClock } from "./bubble-clock.ts";
import {
  type BubbleInput,
  type BubblePlacement,
  bubblesIntersect,
  layoutBubbles,
} from "./bubble-layout.ts";

const canvas = { width: 500, height: 300 };
const bubble = (id: number, x: number, y = 250): BubbleInput => ({
  id,
  anchor: { x, y },
  width: 180,
  height: 58,
  compact: { width: 100, height: 34 },
});
function check(placements: BubblePlacement[], bounds = canvas) {
  const visible = placements.filter((item) => !item.deferred);
  for (const [index, item] of visible.entries()) {
    expect(item.rect.x).toBeGreaterThanOrEqual(0);
    expect(item.rect.y).toBeGreaterThanOrEqual(0);
    expect(item.rect.x + item.rect.width).toBeLessThanOrEqual(bounds.width);
    expect(item.rect.y + item.rect.height).toBeLessThanOrEqual(bounds.height);
    for (const point of item.tail) {
      expect(point.x).toBeGreaterThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(1);
      expect(point.x).toBeLessThanOrEqual(bounds.width - 1);
      expect(point.y).toBeLessThanOrEqual(bounds.height - 1);
    }
    expect(item.tail[1]).toEqual(item.anchor);
    expect(
      item.rect.y + item.rect.height <= item.anchor.y ||
        item.rect.x >= item.anchor.x + 1 ||
        item.rect.x + item.rect.width <= item.anchor.x - 1,
    ).toBe(true);
    for (const other of visible.slice(index + 1))
      expect(bubblesIntersect(item.rect, other.rect)).toBe(false);
  }
}

test("neighbors 40px apart stack upward with tails attached to their own heads", () => {
  const result = layoutBubbles([bubble(1, 200), bubble(2, 240)], canvas);
  check(result);
  expect(result.every((item) => !item.deferred)).toBe(true);
  assert(result[0] && result[1]);
  expect(result[1].rect.y + result[1].rect.height).toBeLessThan(result[0].rect.y);
});

test("three neighbors remain disjoint and adding a newcomer leaves displayed positions stable", () => {
  const first = layoutBubbles([bubble(1, 200)], canvas);
  const pair = layoutBubbles([bubble(1, 200), bubble(2, 240)], canvas, first);
  const trio = layoutBubbles([bubble(1, 200), bubble(2, 240), bubble(3, 280)], canvas, pair);
  check(trio);
  expect(trio.every((item) => !item.deferred)).toBe(true);
  expect(trio.slice(0, 2)).toEqual(pair);
});

test.each([
  [1, 200],
  [499, 200],
  [200, 1],
])("body, outline and tail stay inside near %s,%s", (x, y) => {
  const result = layoutBubbles([bubble(1, x, y), bubble(2, x, y)], canvas);
  check(result);
  expect(result.every((item) => !item.deferred)).toBe(true);
});

test("when stacking reaches the top, a later bubble slides sideways", () => {
  const result = layoutBubbles([bubble(1, 200, 70), bubble(2, 240, 70)], canvas);
  check(result);
  assert(result[0] && result[1]);
  expect(result[1].rect.x).toBeGreaterThanOrEqual(result[0].rect.x + result[0].rect.width);
  expect(result[1].tail[0].x).not.toBe(result[1].tail[1].x);
});

test("a message that cannot fit is shortened and deferred until space is available", () => {
  const bounds = { width: 200, height: 80 };
  const inputs = [bubble(1, 80, 75), bubble(2, 120, 75)];
  const result = layoutBubbles(inputs, bounds);
  check(result, bounds);
  expect(result[1]).toMatchObject({ truncated: true, deferred: true });
  const waiting = layoutBubbles(inputs, bounds, result);
  assert(waiting[1] && inputs[1]);
  expect(waiting[1].deferred).toBe(true);
  const next = layoutBubbles([inputs[1]], bounds, waiting);
  check(next, bounds);
  expect(next[0]).toMatchObject({ truncated: true, deferred: false, rect: inputs[1].compact });
  const clock = new BubbleClock(4000);
  expect(clock.advance(10000, false)).toBe(false);
  expect(clock.advance(3999, true)).toBe(false);
  expect(clock.advance(1, true)).toBe(true);
});

test("moving anchors keep tails attached and resolve new collisions", () => {
  const first = layoutBubbles([bubble(1, 100), bubble(2, 350)], canvas);
  const inputs = [bubble(1, 200), bubble(2, 240)];
  const moved = layoutBubbles(inputs, canvas, first);
  check(moved);
  assert(moved[0] && first[0]);
  expect(moved[0].rect.x - first[0].rect.x).toBe(100);
  expect(moved.every((item) => !item.deferred)).toBe(true);
});
