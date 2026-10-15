import { expect, test } from "vitest";
import rawCatalog from "../../public/catalog.json";
import { catalogSchema } from "./catalog.ts";
import tiles from "./fixtures/tiles.json";
import type { Layout } from "./layout.ts";
import { findPath, smoothCorners, walkableGrid } from "./path.ts";

const catalog = catalogSchema.parse(rawCatalog);
const layout: Layout = {
  reception: { chair: "chair", counter: "shelf" },
  meeting: { table: "shelf", chairs: [] },
  lounge: [],
  standing: [],
  size: { w: 6, h: 6 },
  ground: ["UUUUUU", "LLLLLL", "wwwwww", "wwwwww", "wwwwww", "wwwwww"],
  objects: [
    { id: "shelf", item: "bookshelf", x: 2, y: 3 },
    { id: "chair", item: "chair-left", x: 1, y: 4 },
  ],
  zones: [],
  points: {},
  spots: [],
  hostZones: {},
};
test("path avoids furniture and walls", () => {
  const path = findPath(layout, catalog, { x: 1, y: 3 }, { x: 4, y: 3 }, tiles.codes);
  expect(path.length).toBeGreaterThan(2);
  const grid = walkableGrid(layout, catalog, tiles.codes);
  for (const point of path)
    expect(grid[Math.floor(point.y / 32)]?.[Math.floor(point.x / 32)]).toBe(true);
  expect(grid[0]?.every((cell) => !cell)).toBe(true);
  expect(grid[1]?.every((cell) => !cell)).toBe(true);
  const custom = structuredClone(layout);
  custom.ground[2] = "NNNNNN";
  expect(walkableGrid(custom, catalog, tiles.codes)[2]?.every((cell) => !cell)).toBe(true);
});
test("chair cells are reachable as either endpoint", () => {
  const start = { x: 1, y: 4 };
  const end = { x: 5, y: 5 };
  expect(findPath(layout, catalog, start, end)[0]).toEqual({ x: 48, y: 144 });
  expect(findPath(layout, catalog, end, start).at(-1)).toEqual({ x: 48, y: 144 });
});
test("smooth a corner only when both side cells are free", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ];
  expect(smoothCorners(path, () => true)).toEqual([path[0], path[2]]);
  expect(smoothCorners(path, (p) => p.x !== 0 || p.y !== 1)).toEqual(path);
});
test("unreachable destination returns no path", () => {
  expect(findPath(layout, catalog, { x: 0, y: 0 }, { x: 5, y: 5 })).toEqual([]);
});
