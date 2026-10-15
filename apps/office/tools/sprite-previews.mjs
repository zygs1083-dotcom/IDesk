import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { chromatic, hue, hueChoices, hueDistance } from "./character-hue.mjs";
import { crop, paste, resize, saveJson, savePng } from "./furniture-image.mjs";
import { errors } from "./palette.mjs";
import { fallbackPreviews } from "./sprite-fallbacks.mjs";

export function characterPreviews(before, after, frames, kinds, colors) {
  const comparison = new PNG({ width: 384, height: 96 * kinds.length });
  const histogram = new Map();
  const locations = kinds.map(() => []);
  const hueReport = kinds.map((kind) => ({
    kind,
    participating: 0,
    eligible: 0,
    grey: 0,
    greyColored: 0,
    jumped: 0,
    crossHue: 0,
    changed: 0,
    fallback: 0,
    examples: new Map(),
  }));
  for (let p = 0; p < before.data.length; p += 4) {
    if (before.data[p + 3] < 128) continue;
    const rgb = [...before.data.subarray(p, p + 3)];
    const stats = hueReport[Math.floor(p / 4 / before.width / 96)];
    stats.participating++;
    if (Math.max(...rgb) >= 51 && Math.max(...rgb) - Math.min(...rgb) <= 24) {
      stats.grey++;
      const output = [...after.data.subarray(p, p + 3)];
      if (Math.max(...output) - Math.min(...output) > 24) stats.greyColored++;
    }
    if (chromatic(rgb) && Math.max(...rgb) - Math.min(...rgb) > 24) {
      stats.eligible++;
      const fallback = hueChoices(rgb, colors) === colors;
      if (fallback) {
        stats.fallback++;
        locations[Math.floor(p / 4 / before.width / 96)].push({
          x: (p / 4) % before.width,
          y: Math.floor(p / 4 / before.width),
        });
      }
      if (hueDistance(rgb, [...after.data.subarray(p, p + 3)]) > 20) {
        stats.crossHue++;
        if (!fallback) stats.jumped++;
        if (Math.hypot(...rgb.map((v, i) => v - after.data[p + i])) > 20) stats.changed++;
        const key = String(rgb);
        const entry = stats.examples.get(key) ?? { rgb, hue: hue(rgb), pixels: 0 };
        entry.pixels++;
        stats.examples.set(key, entry);
      }
    }
    const key = String(rgb);
    const point = histogram.get(key) ?? { rgb, weight: 0 };
    point.weight++;
    histogram.set(key, point);
  }
  for (const [row, kind] of kinds.entries()) {
    const faces = new PNG({ width: 128, height: 48 });
    const identity = new PNG({ width: 96, height: 144 });
    for (const [col, pose] of ["walk/down/0", "sit/down", "sit/up"].entries()) {
      for (const [version, atlas] of [before, after].entries()) {
        const png = crop(atlas, frames[`${kind}/${pose}`].frame);
        paste(comparison, png, (col * 2 + version) * 64, row * 96);
        paste(identity, crop(png, { x: 8, y: 40, w: 48, h: 48 }), version * 48, col * 48);
        if (col === 1) paste(faces, crop(png, { x: 0, y: 12, w: 64, h: 48 }), version * 64, 0);
      }
    }
    savePng(`assets/probe/front-seating-face-${kind}@6x.png`, resize(faces, 768, 288));
    savePng(`assets/probe/front-seating-identity-${kind}@6x.png`, resize(identity, 576, 864));
  }
  fallbackPreviews(before, after, frames, kinds, locations);
  savePng("assets/probe/front-seating-before-after@3x.png", resize(comparison, 1152, 1728));
  saveJson(
    "assets/probe/front-seating-hue.json",
    hueReport.map(({ examples, ...row }) => ({
      ...row,
      examples: [...examples.values()].sort((a, b) => b.pixels - a.pixels).slice(0, 10),
    })),
  );
  assert.ok(
    hueReport.every((entry) => entry.jumped === 0 && entry.fallback / entry.participating <= 0.001),
    "角色色相保持或回退比例",
  );
  assert.ok(
    hueReport.every((entry) => entry.greyColored === 0),
    "灰色像素量化后仍为无彩色",
  );
  const error = errors([...histogram.values()], colors, true);
  saveJson("assets/probe/front-seating-error.json", error);
  return error;
}
