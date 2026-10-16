import { expect, test } from "vitest";
import { tailIntersectsRect } from "./bubble-tail.ts";

test.each([
  [
    [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ],
    true,
  ],
  [
    [
      { x: 50, y: 0 },
      { x: 50, y: 100 },
    ],
    true,
  ],
  [
    [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ],
    true,
  ],
  [
    [
      { x: 0, y: 38 },
      { x: 100, y: 38 },
    ],
    false,
  ],
  [
    [
      { x: 0, y: 39 },
      { x: 100, y: 39 },
    ],
    true,
  ],
  [
    [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ],
    false,
  ],
] as const)("tail collision includes the 2px stroke: %j", (tail, expected) => {
  expect(tailIntersectsRect([...tail], { x: 40, y: 40, width: 20, height: 20 })).toBe(expected);
});
