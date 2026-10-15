import { expect, test } from "vitest";
import { palette } from "./furniture.mjs";
import { readJson } from "./furniture-image.mjs";
import { clusters, errors } from "./palette.mjs";

test("weighted k-means is deterministic and centers preserve weighted RGB means", () => {
  const points = [
    { rgb: [10, 20, 30], weight: 3 },
    { rgb: [30, 40, 50], weight: 1 },
  ];
  expect(clusters(points, 1)).toEqual([[15, 25, 35]]);
  expect(clusters(points, 2)).toEqual(clusters(points, 2));
  expect(clusters(points, 2).sort((a, b) => a[0] - b[0])).toEqual(points.map((p) => p.rgb));
});

test("weighted RGB error and percentile account for every opaque pixel", () => {
  const points = [
    { rgb: [0, 0, 0], weight: 96 },
    { rgb: [10, 0, 0], weight: 4 },
  ];
  expect(errors(points, [[0, 0, 0]])).toEqual({ pixels: 100, mean: 0.4, p95: 0 });
  expect(
    errors(points, [
      [0, 0, 0],
      [10, 0, 0],
    ]),
  ).toEqual({ pixels: 100, mean: 0, p95: 0 });
});

test("added colors are the four highest-residual centers, with measured improvement", () => {
  const report = readJson("assets/probe/quantization-error.json");
  expect(report.added).toEqual(report.clusters.slice(0, 4).map((c) => c.rgb));
  expect(palette().slice(32)).toEqual(report.added);
  expect(report.after34.mean).toBeLessThan(report.before.mean);
  expect(report.after.mean).toBeLessThan(report.after34.mean);
  expect(report.after.p95).toBeLessThan(report.after34.p95);
});
