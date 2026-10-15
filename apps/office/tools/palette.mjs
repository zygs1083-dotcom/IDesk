import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { nearest } from "./furniture.mjs";
import { readPng, saveJson, savePng } from "./furniture-image.mjs";
import { people, poses } from "./probe.mjs";

const distance = (a, b) => a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0);

export function clusters(points, count) {
  const centers = [[...points.reduce((a, b) => (a.weight >= b.weight ? a : b)).rgb]];
  while (centers.length < count) {
    const farthest = points.reduce(
      (best, point) => {
        const score =
          Math.min(...centers.map((center) => distance(center, point.rgb))) * point.weight;
        return score > best.score ? { rgb: point.rgb, score } : best;
      },
      { score: -1, rgb: points[0].rgb },
    );
    centers.push([...farthest.rgb]);
  }
  for (let iteration = 0; iteration < 30; iteration++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const point of points) {
      const index = centers.indexOf(nearest(point.rgb, centers));
      for (let c = 0; c < 3; c++) sums[index][c] += point.rgb[c] * point.weight;
      sums[index][3] += point.weight;
    }
    let movement = 0;
    for (const [i, sum] of sums.entries()) {
      if (!sum[3]) continue;
      const center = sum.slice(0, 3).map((channel) => channel / sum[3]);
      movement += distance(center, centers[i]);
      centers[i] = center;
    }
    if (movement < 0.0001) break;
  }
  return centers;
}

export function errors(points, colors) {
  const distances = points
    .map(({ rgb, weight }) => ({ value: Math.sqrt(distance(rgb, nearest(rgb, colors))), weight }))
    .sort((a, b) => a.value - b.value);
  const pixels = points.reduce((sum, point) => sum + point.weight, 0);
  let accumulated = 0;
  const p95 = distances.find((entry) => {
    accumulated += entry.weight;
    return accumulated >= pixels * 0.95;
  }).value;
  return {
    pixels,
    mean: distances.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / pixels,
    p95,
  };
}

export function buildPalette() {
  const original = readPng("assets/palette.png");
  const base = Array.from({ length: 32 }, (_, i) => [...original.data.subarray(i * 4, i * 4 + 3)]);
  const histogram = new Map();
  const characters = people();
  for (const png of [readPng("public/sprites.png"), ...poses.map((pose) => characters[pose])]) {
    for (let p = 0; p < png.data.length; p += 4) {
      if (png.data[p + 3] < 128) continue;
      const key = (png.data[p] << 16) | (png.data[p + 1] << 8) | png.data[p + 2];
      histogram.set(key, (histogram.get(key) ?? 0) + 1);
    }
  }
  const points = [...histogram]
    .sort((a, b) => a[0] - b[0])
    .map(([rgb, weight]) => ({ rgb: [rgb >> 16, (rgb >> 8) & 255, rgb & 255], weight }));
  const centers = clusters(points, 16);
  const ranked = centers
    .map((center) => {
      const members = points.filter((point) => nearest(point.rgb, centers) === center);
      const weight = members.reduce((sum, point) => sum + point.weight, 0);
      const residual =
        members.reduce(
          (sum, point) => sum + distance(point.rgb, nearest(point.rgb, base)) * point.weight,
          0,
        ) / weight;
      return { rgb: center.map(Math.round), weight, residual };
    })
    .sort((a, b) => b.residual - a.residual);
  const additions = ranked.slice(0, 4).map((cluster) => cluster.rgb);
  const colors = [...base, ...additions];
  assert.equal(new Set(colors.map(String)).size, 36);
  const png = new PNG({ width: 36, height: 1 });
  colors.forEach((color, i) => {
    png.data.set([...color, 255], i * 4);
  });
  savePng("assets/palette.png", png);
  const report = {
    method: "weighted RGB k-means, k=16, max 30 iterations; rank by mean squared 32-color residual",
    clusters: ranked,
    added: additions,
    before: errors(points, base),
    after34: errors(points, colors.slice(0, 34)),
    after: errors(points, colors),
  };
  saveJson("assets/probe/quantization-error.json", report);
  console.log(
    `调色板36色；RGB误差均值 ${report.before.mean.toFixed(3)} → ${report.after.mean.toFixed(3)}；P95 ${report.before.p95.toFixed(3)} → ${report.after.p95.toFixed(3)}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildPalette();
