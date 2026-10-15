import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { expect, test } from "vitest";
import raw from "../../public/layout.json";
import { cellCenter, cellOf, findPath, smoothCorners } from "./path.ts";

const layout = {
  ...parseOfficeLayout(raw),
  grid: { cell: 16 as const, rows: [".....", ".###.", "....."] },
};
test("A* routes around blocked 16px cells", () => {
  const path = findPath(layout, { x: 0, y: 1 }, { x: 4, y: 1 });
  expect(path[0]).toEqual({ x: 8, y: 24 });
  expect(path.at(-1)).toEqual({ x: 72, y: 24 });
  for (const point of path) {
    const cell = cellOf(point);
    expect(layout.grid.rows[cell.y]?.[cell.x]).toBe(".");
  }
});
test("start and destination cells remain walkable for the traveller", () => {
  expect(findPath(layout, { x: 1, y: 1 }, { x: 3, y: 1 }).length).toBeGreaterThan(0);
  expect(findPath(layout, { x: -1, y: 0 }, { x: 0, y: 0 })).toEqual([]);
  expect(cellOf(cellCenter({ x: 4, y: 2 }))).toEqual({ x: 4, y: 2 });
});
test("corner smoothing only cuts across two clear adjacent cells", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ];
  expect(smoothCorners(path, () => true)).toEqual([path[0], path[2]]);
  expect(smoothCorners(path, (p) => p.x !== 0 || p.y !== 1)).toEqual(path);
});
