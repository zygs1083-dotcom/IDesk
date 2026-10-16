import { expect, test } from "vitest";
import { headPosition } from "./screen-position.ts";

test.each([0.4, 0.66, 1, 2])(
  "head follows world translation at scale %s in CSS pixels",
  (scale) => {
    const project = ({ x, y }: { x: number; y: number }) => ({
      x: 30 + x * scale,
      y: 20 + y * scale,
    });
    expect(headPosition({ x: 500, y: 400 }, project)).toEqual({
      x: 30 + 500 * scale,
      y: 20 + 296 * scale,
    });
  },
);
