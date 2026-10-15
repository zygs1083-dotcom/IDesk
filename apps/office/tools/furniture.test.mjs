import { PNG } from "pngjs";
import { expect, test } from "vitest";
import {
  bounds,
  crop,
  nearest,
  palette,
  quantize,
  readJson,
  readPng,
  verify,
} from "./furniture.mjs";
import { assertSorting, objects, people, placements, poses } from "./probe.mjs";
import { assertSeam, drawTile } from "./tiles.mjs";

const colors = palette();
test("palette has exactly 32 distinct opaque colors", () => {
  expect(colors).toHaveLength(32);
  expect(new Set(colors.map(String)).size).toBe(32);
  const png = readPng("assets/palette.png");
  expect([...png.data].filter((_, i) => i % 4 === 3).every((alpha) => alpha === 255)).toBe(true);
});

test("RGB distance chooses the closest palette entry, with stable ties", () => {
  for (let r = 0; r < 256; r += 31) {
    for (let g = 0; g < 256; g += 31) {
      for (let b = 0; b < 256; b += 31) {
        const rgb = [r, g, b];
        const distance = (color) => color.reduce((sum, c, i) => sum + (c - rgb[i]) ** 2, 0);
        expect(distance(nearest(rgb, colors))).toBe(Math.min(...colors.map(distance)));
      }
    }
  }
  expect(
    nearest(
      [1, 0, 0],
      [
        [0, 0, 0],
        [2, 0, 0],
      ],
    ),
  ).toEqual([0, 0, 0]);
});

test("alpha threshold is binary and transparent RGB is cleared", () => {
  const png = new PNG({ width: 4, height: 1 });
  [0, 127, 128, 255].forEach((alpha, i) => {
    png.data.set([117, 73, 199, alpha], i * 4);
  });
  quantize(png, colors);
  expect([3, 7, 11, 15].map((i) => png.data[i])).toEqual([0, 0, 255, 255]);
  expect([...png.data.subarray(0, 8)]).toEqual(Array(8).fill(0));
  verify(png, colors);
  png.data[3] = 1;
  expect(() => verify(png, colors)).toThrow();
});

for (const name of ["floor/wood", "floor/carpet", "floor/tile"]) {
  test(`${name} has matching edges in both axes, including a 2x2 junction`, () => {
    const png = drawTile(name, colors);
    assertSeam(png);
    verify(png, colors);
    png.data[0] ^= 1;
    expect(() => assertSeam(png)).toThrow();
  });
}

test("every catalog part exists, and chair masks partition the complete source frame", () => {
  const frames = readJson("public/furniture.json").frames;
  const atlas = readPng("public/furniture.png");
  const { items } = readJson("public/catalog.json");
  for (const item of Object.values(items)) {
    for (const part of item.parts) expect(frames[part.frame]).toBeDefined();
  }
  for (const direction of ["down", "up", "left", "right"]) {
    const behind = crop(atlas, frames[`chair-${direction}-behind`].frame);
    const front = crop(atlas, frames[`chair-${direction}-front`].frame);
    for (let p = 3; p < behind.data.length; p += 4) expect(behind.data[p] && front.data[p]).toBe(0);
    expect(bounds(behind).h).toBeGreaterThan(0);
    expect(bounds(front).h).toBeGreaterThan(0);
    const chair = items[`chair-${direction}`];
    expect(chair.parts[0].sortY).toBeLessThan(chair.seat.y);
    expect(chair.parts[1].sortY).toBeGreaterThan(chair.seat.y);
    expect(chair.blocks).toBe(false);
  }
  verify(atlas, colors);
});

test("probe seats put behind < person < front and person on correct side of desk", () => {
  const { items } = readJson("public/catalog.json");
  const list = objects(items, {}, {});
  assertSorting(list);
  expect(placements.filter((p) => p.pose)).toHaveLength(5);
  const host = list.find((p) => p.id === "host" && p.frame === "person");
  const counter = list.find((p) => p.id === "reception");
  expect(host.sortY).toBeLessThan(counter.sortY);
  host.sortY = counter.sortY + 1;
  expect(() => assertSorting(list)).toThrow();
});

test("world seated heights are 85–90% standing and head widths stay within 10%", () => {
  const characters = people();
  const standing = bounds(characters.standing);
  for (const pose of poses) {
    const png = characters[pose];
    const box = bounds(png);
    expect(box.h / standing.h).toBeGreaterThanOrEqual(0.85);
    expect(box.h / standing.h).toBeLessThanOrEqual(0.9);
    const head = bounds(crop(png, { x: 0, y: box.y, w: 64, h: Math.floor(box.h / 2) }));
    expect(head.w / standing.w).toBeGreaterThanOrEqual(0.9);
    expect(head.w / standing.w).toBeLessThanOrEqual(1.1);
    expect(box.y + box.h).toBe(96);
  }
});
