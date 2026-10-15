import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { characterColors } from "./character-colors.mjs";
import { rgbDistanceSquared as distance, hueChoices } from "./character-hue.mjs";
import { nearest } from "./furniture.mjs";
import { readPng, saveJson, savePng } from "./furniture-image.mjs";
import { identityColors, preserveSignatures } from "./palette-identity.mjs";
import { refineSignatures } from "./palette-refine.mjs";

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

export function errors(points, colors, preserveHue = false) {
  const distances = points
    .map(({ rgb, weight }) => ({
      value: Math.sqrt(distance(rgb, nearest(rgb, preserveHue ? hueChoices(rgb, colors) : colors))),
      weight,
    }))
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
  const base = Array.from({ length: 36 }, (_, i) => [...original.data.subarray(i * 4, i * 4 + 3)]);
  const { points, candidates, greys } = characterColors();
  const { signatures, excluded } = identityColors(candidates);
  const { colors, added } = preserveSignatures(signatures, base);
  refineSignatures(colors, added, signatures, points);
  const centers = colors.length === 40 ? [] : clusters(points, 16);
  const ranked =
    colors.length === 40
      ? []
      : centers
          .map((center, index) => {
            const rgb = center.map(Math.round);
            const members = points.filter((point) => nearest(point.rgb, centers) === center);
            const weight = members.reduce((sum, point) => sum + point.weight, 0);
            const residual =
              members.reduce(
                (sum, point) =>
                  sum + distance(point.rgb, nearest(point.rgb, colors)) * point.weight,
                0,
              ) / weight;
            return { rgb, weight, residual, index };
          })
          .sort((a, b) => b.residual - a.residual || a.index - b.index);
  for (const entry of ranked) {
    if (colors.length === 40) break;
    if (colors.some((color) => distance(color, entry.rgb) === 0)) continue;
    colors.push(entry.rgb);
    added.push({ rgb: entry.rgb, source: [`k-means cluster ${entry.index}`] });
  }
  const neutrals = clusters(greys, 2)
    .map((rgb) => rgb.map(Math.round))
    .sort((a, b) => a[0] - b[0]);
  for (const [i, rgb] of neutrals.entries()) {
    colors.push(rgb);
    added.push({
      rgb,
      source: [
        `neutral clothing ${i === 0 ? "dark" : "medium"}; lower-body y 0.5–0.9, S<0.15, V 0.2–0.8; weighted k-means2`,
      ],
    });
  }
  const png = new PNG({ width: colors.length, height: 1 });
  colors.forEach((color, i) => {
    png.data.set([...color, 255], i * 4);
  });
  savePng("assets/palette.png", png);
  const report = {
    method:
      "fixed garment RGB regions; area-weighted centers; remove S<0.15 and shared clusters; joint <=20 RGB coverage; preserve first40; append neutral clothing k-means2; character quantization V>=0.2 chroma<=24 neutral candidates, remaining S>=0.15 hue<=20deg",
    preserved: base.length,
    added: added.map(({ source, ...entry }) => ({ ...entry, source: source.join(", ") })),
    signatures: signatures.map(({ region, ...signature }) => ({
      ...signature,
      quantized: nearest(signature.rgb, colors),
      distance: Math.sqrt(distance(signature.rgb, nearest(signature.rgb, colors))),
      before: errors(region, base),
      after: errors(region, colors, true),
    })),
    excluded: excluded.map(({ region, ...entry }) => ({
      ...entry,
      quantized: nearest(entry.rgb, colors),
      distance: Math.sqrt(distance(entry.rgb, nearest(entry.rgb, colors))),
      before: errors(region, base),
      after: errors(region, colors, true),
    })),
    clusters: ranked,
    before: errors(points, base),
    after: errors(points, colors, true),
  };
  saveJson("assets/probe/quantization-error.json", report);
  console.log(
    `调色板${colors.length}色；标志色${signatures.length}项≤20；RGB误差均值 ${report.before.mean.toFixed(3)} → ${report.after.mean.toFixed(3)}；P95 ${report.before.p95.toFixed(3)} → ${report.after.p95.toFixed(3)}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildPalette();
