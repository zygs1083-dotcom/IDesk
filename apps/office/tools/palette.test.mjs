import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { hueDistance, rgbDistanceSquared } from "./character-hue.mjs";
import { palette } from "./furniture.mjs";
import { readJson, readPng } from "./furniture-image.mjs";
import { clusters, errors } from "./palette.mjs";
import { identityColors, preserveSignatures } from "./palette-identity.mjs";
import { refineSignatures } from "./palette-refine.mjs";

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

test("palette preserves all 40 existing entries and guarantees chromatic identity centers", () => {
  const colors = palette();
  const report = readJson("assets/probe/quantization-error.json");
  expect(colors).toHaveLength(42);
  expect(
    createHash("sha256").update(readPng("assets/palette.png").data.subarray(0, 144)).digest("hex"),
  ).toBe("4d9588badd4dc5703d4dd1790b57ca99bf0c7ee7803fee33ac6be9144b7bedc6");
  expect(
    createHash("sha256").update(readPng("assets/palette.png").data.subarray(0, 160)).digest("hex"),
  ).toBe("619040585ea8b26a5faa04ba1214ec954ae15c2a501ce615646650c5614f0700");
  expect(colors.slice(40)).toEqual([
    [61, 61, 61],
    [81, 81, 81],
  ]);
  expect(colors.slice(36)).toEqual(report.added.map((entry) => entry.rgb));
  for (const signature of report.signatures) {
    expect(signature.saturation).toBeGreaterThanOrEqual(0.15);
    expect(signature.distance).toBeLessThanOrEqual(20);
    expect(Number.isFinite(signature.after.mean)).toBe(true);
    expect(Number.isFinite(signature.after.p95)).toBe(true);
  }
  for (const entry of report.excluded) {
    if (entry.reason === "achromatic") expect(entry.saturation).toBeLessThan(0.15);
    if (entry.reason === "common") expect(entry.diameter).toBeLessThan(30);
  }
  expect(report.signatures.some((s) => s.kind === "receptionist" && s.garment === "scarf")).toBe(
    true,
  );
  expect(report.signatures.some((s) => s.kind === "claude-code" && s.garment === "hoodie")).toBe(
    true,
  );
  expect(Number.isFinite(report.after.mean)).toBe(true);
});

test("joint selection uses one new center to cover two nearby identity colors", () => {
  const signatures = [
    { kind: "a", garment: "shirt", rgb: [100, 100, 100], pixels: 1 },
    { kind: "b", garment: "shirt", rgb: [130, 100, 100], pixels: 1 },
  ];
  const result = preserveSignatures(signatures, [[0, 0, 0]]);
  expect(result.added).toEqual([{ rgb: [115, 100, 100], source: ["a/shirt", "b/shirt"] }]);
});

test("shared garment clusters and achromatic regions do not consume identity slots", () => {
  const candidate = (kind, garment, rgb, pixels) => ({
    kind,
    garment,
    rgb,
    pixels,
    saturation: (Math.max(...rgb) - Math.min(...rgb)) / Math.max(...rgb),
    region: [{ rgb, weight: pixels }],
  });
  const result = identityColors([
    candidate("a", "brown", [120, 80, 40], 100),
    candidate("b", "brown", [122, 82, 42], 100),
    candidate("a", "grey", [60, 60, 60], 100),
    candidate("a", "shirt", [30, 150, 180], 50),
    candidate("b", "scarf", [220, 40, 35], 10),
  ]);
  expect(result.signatures.map((entry) => entry.garment)).toEqual(["shirt", "scarf"]);
  expect(result.excluded.filter((entry) => entry.reason === "common")).toHaveLength(2);
  expect(result.excluded.filter((entry) => entry.reason === "achromatic")).toHaveLength(1);
});

test("identity refinement covers missing hues without moving more than 20 RGB units", () => {
  const rgb = [37, 89, 186];
  const pixel = [44, 36, 126];
  const base = palette().slice(0, 36);
  const colors = [...base, rgb];
  const added = [{ rgb, source: ["script/cap"] }];
  refineSignatures(
    colors,
    added,
    [{ kind: "script", garment: "cap", rgb, region: [{ rgb, weight: 1 }] }],
    [{ rgb: pixel, weight: 100 }],
  );
  expect(colors.slice(0, 36)).toEqual(base);
  expect(rgbDistanceSquared(rgb, added[0].rgb)).toBeLessThanOrEqual(400);
  expect(hueDistance(pixel, added[0].rgb)).toBeLessThanOrEqual(20);
});
