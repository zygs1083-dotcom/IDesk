import { expect, test } from "vitest";
import rawCatalog from "../../public/catalog.json";
import rawLayout from "../../public/layout.json";
import tiles from "../../public/tiles.json";
import { catalogSchema, TILE } from "./catalog.ts";
import { parseLayout } from "./layout.ts";
import { findPath, walkableGrid } from "./path.ts";
import { seats } from "./seats.ts";

const catalog = catalogSchema.parse(rawCatalog);
const layout = parseLayout(rawLayout, catalog);
const grid = walkableGrid(layout, catalog, tiles.codes);
const seatTiles = seats(layout, catalog).map((seat) => ({
  id: seat.id,
  x: Math.floor(seat.x / TILE),
  y: Math.floor(seat.y / TILE),
}));
const targets = [
  ...seatTiles,
  ...layout.spots,
  ...Object.entries(layout.points).map(([id, point]) => ({ id, ...point })),
];
for (const target of targets) {
  test(`door reaches ${target.id} at ${target.x},${target.y}`, () => {
    const isSeat = seatTiles.some((seat) => seat.x === target.x && seat.y === target.y);
    expect(grid[target.y]?.[target.x] || isSeat).toBe(true);
    const path = findPath(layout, catalog, rawLayout.points.door, target, tiles.codes);
    expect(path.length).toBeGreaterThan(0);
    expect(path.at(-1)).toEqual({ x: (target.x + 0.5) * TILE, y: (target.y + 0.5) * TILE });
    for (const point of path.slice(0, -1))
      expect(grid[Math.floor(point.y / TILE)]?.[Math.floor(point.x / TILE)]).toBe(true);
  });
}
test("four workspaces have sixteen desks and chairs; meeting has six seats", () => {
  expect(layout.zones).toHaveLength(4);
  for (const zone of layout.zones) {
    expect(zone.desks).toHaveLength(4);
    expect(zone.chairs).toHaveLength(4);
  }
  expect(seatTiles.filter((seat) => seat.id.startsWith("meeting-"))).toHaveLength(6);
  expect(layout.spots).toHaveLength(8);
});
