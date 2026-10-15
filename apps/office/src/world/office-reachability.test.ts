import { readFileSync } from "node:fs";
import { type OfficeLayout, parseOfficeLayout } from "@idesk/shared/office-layout";
import type { Layout } from "@idesk/shared/office-schemas";
import { describe, expect, it } from "vitest";
import { findPath } from "./path.ts";

const office = parseOfficeLayout(
  JSON.parse(readFileSync(new URL("../../assets/layout.json", import.meta.url), "utf8")),
);
const points = office.points as NonNullable<OfficeLayout["points"]>;
const spots = office.spots as NonNullable<OfficeLayout["spots"]>;
const standing = office.standing as NonNullable<OfficeLayout["standing"]>;
// The v2 pathfinder consumes cell indices; its 32px output scale does not affect grid topology.
const layout: Layout = {
  size: { w: (office.grid.rows[0] as string).length, h: office.grid.rows.length },
  ground: office.grid.rows.map((row) => row.replaceAll("#", "U")),
  objects: [],
  zones: [],
  reception: { chair: "", counter: "" },
  meeting: { table: "", chairs: [] },
  lounge: [],
  standing: [],
  points: {},
  spots: [],
  hostZones: {},
};
const cell = (p: { x: number; y: number }) => ({
  x: Math.floor(p.x / office.grid.cell),
  y: Math.floor(p.y / office.grid.cell),
});
const destinations = [
  ...office.seats,
  ...Object.entries(points).map(([id, point]) => ({ id, ...point })),
  ...spots,
  ...standing.map((point, i) => ({ id: `standing-${i}`, ...point })),
];

describe("v3 measured walk grid", () => {
  it("includes all sixteen workstation seats and all twenty-six seats", () => {
    expect(office.seats.filter((seat) => seat.zone)).toHaveLength(16);
    expect(office.seats).toHaveLength(26);
  });
  for (const destination of destinations) {
    it(`connects the door to ${destination.id} without crossing furniture or walls`, () => {
      const start = cell(points.door as { x: number; y: number });
      const end = cell(destination);
      const path = findPath(layout, { tile: 32, items: {} }, start, end);
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: start.x * 32 + 16, y: start.y * 32 + 16 });
      expect(path.at(-1)).toEqual({ x: end.x * 32 + 16, y: end.y * 32 + 16 });
      for (const point of path)
        expect(
          (office.grid.rows[Math.floor(point.y / 32)] as string)[Math.floor(point.x / 32)],
        ).toBe(".");
    });
  }

  it("blocks desk, counter, table and wall footprints", () => {
    for (const point of [
      { x: 624, y: 320 },
      { x: 1000, y: 320 },
      { x: 624, y: 640 },
      { x: 1000, y: 640 },
      { x: 200, y: 680 },
      { x: 1400, y: 208 },
      { x: 1480, y: 584 },
      { x: 1264, y: 448 },
      { x: 600, y: 80 },
    ]) {
      const p = cell(point);
      expect((office.grid.rows[p.y] as string)[p.x]).toBe("#");
    }
  });
});
