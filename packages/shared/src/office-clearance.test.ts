import { expect, test } from "vitest";
import { floorBounds, inClearance } from "./office-clearance.ts";
import { fixture } from "./office-layout.fixture.ts";

test("a sloped silhouette is clipped to the whole ground band", () => {
  const item = {
    id: "slant",
    polygon: [
      [0, 0],
      [100, 0],
      [60, 100],
      [40, 100],
    ] as [number, number][],
    baseline: 80,
    floorTop: 50,
  };
  expect(floorBounds(item)).toEqual({ left: 20, right: 80, top: 50, bottom: 80 });
});

test("a chair below its extracted back projects only the lowest silhouette edge", () => {
  const item = {
    id: "chair",
    polygon: [
      [0, 0],
      [100, 0],
      [60, 40],
      [40, 40],
    ] as [number, number][],
    baseline: 70,
    floorTop: 50,
  };
  expect(floorBounds(item)).toEqual({ left: 40, right: 60, top: 50, bottom: 70 });
});

test("ground clearance extends below a tabletop sorting line but keeps the rear aisle open", () => {
  const layout = fixture();
  layout.occluders[0] = {
    id: "counter",
    polygon: [
      [100, 0],
      [200, 0],
      [200, 180],
      [100, 180],
    ],
    baseline: 120,
    floorTop: 100,
    floorBottom: 180,
  };
  expect(inClearance({ x: 90, y: 99 }, layout)).toBe(false);
  expect(inClearance({ x: 90, y: 160 }, layout)).toBe(true);
  expect(inClearance({ x: 90, y: 181 }, layout)).toBe(false);
});
