import { PNG } from "pngjs";
import { expect, test } from "vitest";
import { characterFringe, removeCharacterFringe } from "./character-edges.mjs";
import { chromatic, hueChoices, hueDistance } from "./character-hue.mjs";
import { repairCharacterInterior } from "./character-interior.mjs";
import { quantize } from "./furniture.mjs";
import { readJson } from "./furniture-image.mjs";

test("character quantization preserves cyan instead of a closer blue", () => {
  const original = [43, 151, 172];
  const colors = [
    [48, 119, 195],
    [33, 115, 125],
  ];
  const png = new PNG({ width: 1, height: 1 });
  png.data.set([...original, 255]);
  quantize(png, colors, undefined, true);
  expect([...png.data.subarray(0, 3)]).toEqual(colors[1]);
  expect(hueDistance(original, colors[1])).toBeLessThanOrEqual(20);
  png.data.set([...original, 255]);
  quantize(png, colors);
  expect([...png.data.subarray(0, 3)]).toEqual(colors[0]);
});

test("hue wraps through red, exempts dark and achromatic pixels, and falls back on empty choices", () => {
  expect(hueDistance([255, 0, 10], [255, 10, 0])).toBeLessThan(5);
  expect(chromatic([50, 0, 0])).toBe(false);
  expect(chromatic([51, 0, 0])).toBe(true);
  expect(chromatic([100, 90, 90])).toBe(false);
  expect(chromatic([100, 85, 85])).toBe(true);
  const colors = [[0, 255, 0]];
  expect(hueChoices([255, 0, 0], colors)).toBe(colors);
  expect(hueChoices([40, 20, 20], colors)).toBe(colors);
});

test("every kind preserves candidate hue and limits fallbacks and less than 2% fringe loss", () => {
  const report = readJson("assets/probe/front-seating-hue.json");
  expect(report).toHaveLength(6);
  for (const row of report) {
    expect(row.eligible).toBeGreaterThan(0);
    expect(row.jumped).toBe(0);
    expect(row.fallback / row.participating).toBeLessThanOrEqual(0.001);
  }
});

test("character cleanup leaves no attached magenta fringe and preserves opaque area", () => {
  for (const row of readJson("assets/probe/front-seating-cleanup.json")) {
    expect(row.remaining).toBe(0);
    expect(row.loss).toBeLessThanOrEqual(0.02);
    expect(row.after).toBe(row.before - row.removed);
  }
});

test("fringe removal is snapshot-based, bounded to two rounds, and preserves dark outlines", () => {
  const png = new PNG({ width: 7, height: 7 });
  for (let y = 1; y <= 5; y++)
    for (let x = 1; x <= 5; x++) png.data.set([150, 30, 200, 255], (y * 7 + x) * 4);
  const result = removeCharacterFringe(png, { rounds: 2 });
  expect(result.rounds).toEqual([16, 8]);
  expect(result.remaining).toBe(1);
  const dark = new PNG({ width: 1, height: 1 });
  dark.data.set([20, 10, 25, 255]);
  expect(removeCharacterFringe(dark).total).toBe(0);
  expect(dark.data[3]).toBe(255);
});

test("four-neighbor diagnostic distinguishes diagonal contact without changing its default", () => {
  const png = new PNG({ width: 3, height: 3 });
  for (let p = 0; p < png.data.length; p += 4) png.data.set([100, 70, 40, 255], p);
  png.data.fill(0, 0, 4);
  png.data.set([150, 30, 200, 255], 16);
  expect(characterFringe(png)).toEqual([16]);
  expect(characterFringe(png, 51, false)).toEqual([]);
});

test("interior magenta repair targets contamination and preserves intentional single pixels", () => {
  const png = new PNG({ width: 5, height: 5 });
  for (let p = 0; p < png.data.length; p += 4) png.data.set([9, 4, 6, 255], p);
  png.data.set([184, 0, 169, 255], 48);
  png.data.set([255, 255, 255, 255], 24);
  expect(
    repairCharacterInterior(png, [
      [48, 35, 31],
      [12, 5, 7],
      [255, 255, 255],
    ]),
  ).toBe(1);
  expect([...png.data.subarray(48, 52)]).toEqual([12, 5, 7, 255]);
  expect([...png.data.subarray(24, 28)]).toEqual([255, 255, 255, 255]);
});
