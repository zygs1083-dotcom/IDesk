import assert from "node:assert/strict";
import { rgbDistanceSquared as distance, hueDistance } from "./character-hue.mjs";
import { nearest } from "./furniture.mjs";

export function identityColors(candidates) {
  const kinds = [...new Set(candidates.map((entry) => entry.kind))];
  const common = new Map();
  const pools = kinds.map((kind) =>
    candidates
      .filter((entry) => entry.kind === kind)
      .flatMap((candidate) => {
        const bins = new Map();
        for (const point of candidate.region) {
          const key = point.rgb.map((c) => Math.floor(c / 16)).join(",");
          const bin = bins.get(key) ?? { sum: [0, 0, 0], weight: 0, key };
          point.rgb.forEach((c, i) => {
            bin.sum[i] += c * point.weight;
          });
          bin.weight += point.weight;
          bins.set(key, bin);
        }
        return [...bins.values()].map((bin) => bin.sum.map((c) => Math.round(c / bin.weight)));
      }),
  );
  for (const seed of candidates) {
    const choices = pools.map((pool) =>
      pool.filter((rgb) => distance(seed.rgb, rgb) < 900 && hueDistance(seed.rgb, rgb) < 20),
    );
    const search = (index, cluster) => {
      if (index === kinds.length) return cluster;
      for (const rgb of choices[index]) {
        if (
          cluster.some(
            (entry) => distance(rgb, entry.rgb) >= 900 || hueDistance(rgb, entry.rgb) >= 20,
          )
        )
          continue;
        const found = search(index + 1, [...cluster, { kind: kinds[index], rgb }]);
        if (found) return found;
      }
    };
    const cluster = search(0, []);
    if (cluster)
      common.set(seed, {
        reason: "common",
        diameter: Math.sqrt(
          Math.max(...cluster.flatMap((a) => cluster.map((b) => distance(a.rgb, b.rgb)))),
        ),
        matches: cluster,
      });
  }

  const excluded = [];
  const signatures = [];
  for (const kind of kinds) {
    const eligible = [];
    for (const entry of candidates.filter((entry) => entry.kind === kind)) {
      if (entry.saturation < 0.15) excluded.push({ ...entry, reason: "achromatic" });
      else if (common.has(entry)) excluded.push({ ...entry, ...common.get(entry) });
      else eligible.push(entry);
    }
    eligible.sort((a, b) => b.pixels - a.pixels || a.garment.localeCompare(b.garment));
    signatures.push(...eligible.slice(0, 2));
    excluded.push(...eligible.slice(2).map((entry) => ({ ...entry, reason: "area" })));
  }
  return { signatures, excluded };
}

export function preserveSignatures(signatures, initial) {
  const colors = initial.map((color) => [...color]);
  const added = [];
  while (signatures.some((s) => distance(s.rgb, nearest(s.rgb, colors)) > 400)) {
    const missing = signatures.filter((s) => distance(s.rgb, nearest(s.rgb, colors)) > 400);
    const candidates = missing.flatMap((a, i) => [
      a.rgb,
      ...missing.slice(i + 1).map((b) => a.rgb.map((v, c) => Math.round((v + b.rgb[c]) / 2))),
    ]);
    const ranked = candidates
      .map((rgb) => {
        const covered = missing.filter((s) => distance(s.rgb, rgb) <= 400);
        return {
          rgb,
          covered,
          error: covered.reduce((sum, s) => sum + distance(s.rgb, rgb) * s.pixels, 0),
        };
      })
      .sort(
        (a, b) =>
          b.covered.length - a.covered.length ||
          a.error - b.error ||
          String(a.rgb).localeCompare(String(b.rgb)),
      );
    const best = ranked[0];
    assert.ok(colors.length < 40, "标志色超出40色预算");
    colors.push(best.rgb);
    added.push({
      rgb: best.rgb,
      source: best.covered.map(({ kind, garment }) => `${kind}/${garment}`),
    });
  }
  return { colors, added };
}
