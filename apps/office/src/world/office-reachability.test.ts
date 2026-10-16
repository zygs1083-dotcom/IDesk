import { readFileSync } from "node:fs";
import { inClearance } from "@idesk/shared/office-clearance";
import { type OfficeLayout, parseOfficeLayout } from "@idesk/shared/office-layout";
import { describe, expect, it } from "vitest";
import { findPath } from "./path.ts";

const office = parseOfficeLayout(
  JSON.parse(readFileSync(new URL("../../public/layout.json", import.meta.url), "utf8")),
);
const points = office.points as NonNullable<OfficeLayout["points"]>;
const spots = office.spots as NonNullable<OfficeLayout["spots"]>;
const standing = office.standing as NonNullable<OfficeLayout["standing"]>;
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
      const path = findPath(office, start, end);
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual({ x: start.x * 16 + 8, y: start.y * 16 + 8 });
      expect(path.at(-1)).toEqual({ x: end.x * 16 + 8, y: end.y * 16 + 8 });
      for (const point of path)
        expect(
          (office.grid.rows[Math.floor(point.y / 16)] as string)[Math.floor(point.x / 16)],
        ).toBe(".");
    });
  }

  it("does not use somebody else's chair entrance as an aisle shortcut", () => {
    const start = cell({ x: 456, y: 232 });
    const end = cell({ x: 808, y: 440 });
    const path = findPath(office, start, end);
    expect(path.length).toBeGreaterThan(0);
    expect(path.filter((point) => inClearance(point, office))).toEqual([]);
  });

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
