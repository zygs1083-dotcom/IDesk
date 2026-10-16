import { floorBounds, inClearance, seatApproaches } from "@idesk/shared/office-clearance";
import { expect, test } from "vitest";
import { readJson, readPng, root } from "./occluder-image.mjs";
import { walkingBounds } from "./walking-silhouette.mjs";

const layout = readJson(`${root}public/layout.json`);
const atlas = readJson(`${root}public/characters.json`);
const sprites = readPng(`${root}public/characters.png`);
const approaches = seatApproaches(layout);
const { left, right, clearance } = walkingBounds(atlas, sprites);
const bounds = layout.occluders.map((item) => ({ id: item.id, ...floorBounds(item) }));
function overlaps(point) {
  return bounds
    .filter(
      (box) =>
        point.y >= box.top &&
        point.y <= box.bottom &&
        point.x + right > box.left &&
        point.x + left < box.right,
    )
    .map((box) => box.id);
}

test("all walkable cells outside chair approaches clear the widest walking silhouette", () => {
  expect(right - left).toBeGreaterThan(0);
  expect(layout.grid.clearance).toBe(clearance);
  const collisions = [];
  for (const [y, row] of layout.grid.rows.entries())
    for (const [x, cell] of [...row].entries())
      if (cell === "." && !approaches.has(`${x},${y}`)) {
        const hits = overlaps({ x: x * 16 + 8, y: y * 16 + 8 });
        if (hits.length) collisions.push({ x, y, hits });
      }
  expect(collisions).toEqual([]);
});

test.each([
  ...layout.spots,
  ...Object.entries(layout.points).map(([id, point]) => ({ id, ...point })),
  ...layout.standing.map((point, i) => ({ id: `standing-${i}`, ...point })),
])("$id: stationary targets clear furniture, including inside chair approach cells", (point) => {
  expect(inClearance(point, layout)).toBe(false);
  expect(overlaps(point)).toEqual([]);
});

test("standing positions keep twice the measured half width between feet", () => {
  for (let i = 0; i < layout.standing.length; i++)
    for (const other of layout.standing.slice(i + 1)) {
      const point = layout.standing[i];
      expect(Math.hypot(point.x - other.x, point.y - other.y)).toBeGreaterThanOrEqual(
        clearance * 2,
      );
    }
});

test("no one-cell horizontal or vertical aisle remains outside seat approaches", () => {
  const narrow = [];
  for (const [y, row] of layout.grid.rows.entries())
    for (const [x, cell] of [...row].entries())
      if (
        cell === "." &&
        !approaches.has(`${x},${y}`) &&
        ((row[x - 1] === "#" && row[x + 1] === "#") ||
          (layout.grid.rows[y - 1]?.[x] === "#" && layout.grid.rows[y + 1]?.[x] === "#"))
      )
        narrow.push({ x, y });
  expect(narrow, "one-cell aisles: count and cell coordinates").toEqual([]);
});
