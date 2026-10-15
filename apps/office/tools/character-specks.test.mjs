import { PNG } from "pngjs";
import { expect, test } from "vitest";
import { colorfulSpecks } from "./character-specks.mjs";

test("colorful specks require isolated RGB and hue disagreement with every saturated neighbor", () => {
  const png = new PNG({ width: 5, height: 5 });
  const frame = { x: 0, y: 0, w: 5, h: 5 };
  for (let p = 0; p < png.data.length; p += 4) png.data.set([80, 80, 80, 255], p);
  png.data.set([200, 30, 30, 255], 48);
  expect(colorfulSpecks(png, frame)).toBe(1);
  png.data.set([190, 40, 40, 255], 44);
  expect(colorfulSpecks(png, frame)).toBe(0);
  png.data.set([200, 30, 30, 255], 44);
  expect(colorfulSpecks(png, frame)).toBe(0);
  png.data.set([80, 80, 80, 255], 44);
  png.data.set([30, 10, 10, 255], 48);
  expect(colorfulSpecks(png, frame)).toBe(0);
  png.data.set([200, 30, 30, 255], 0);
  expect(colorfulSpecks(png, frame)).toBe(0);
});
