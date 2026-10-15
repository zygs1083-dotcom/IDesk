import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { hueChoices } from "./character-hue.mjs";
import {
  bounds,
  crop,
  paste,
  readJson,
  readPng,
  resize,
  saveJson,
  savePng,
} from "./furniture-image.mjs";
import { removeMagenta } from "./sprite-cells.mjs";

export const palette = () => {
  const png = readPng("assets/palette.png");
  assert.ok(png.width >= 36 && png.width <= 42);
  assert.equal(png.height, 1);
  const colors = Array.from({ length: png.width }, (_, i) => [
    ...png.data.subarray(i * 4, i * 4 + 3),
  ]);
  assert.equal(new Set(colors.map(String)).size, png.width);
  return colors;
};

export function nearest(rgb, colors) {
  let best = colors[0];
  let distance = Infinity;
  for (const color of colors) {
    const d = color.reduce((sum, channel, i) => sum + (channel - rgb[i]) ** 2, 0);
    if (d < distance) [best, distance] = [color, d];
  }
  return best;
}

export function quantize(png, colors, materials, preserveHue = false) {
  for (let p = 0; p < png.data.length; p += 4) {
    if (png.data[p + 3] < 128) png.data.fill(0, p, p + 4);
    else {
      const rgb = png.data.subarray(p, p + 3);
      const anchors = materials?.flatMap((group) => group.source);
      const anchor = anchors && nearest(rgb, anchors);
      const group = materials?.find((group) => group.source.includes(anchor));
      const choices = group
        ? group.colors.map((i) => colors[i])
        : preserveHue
          ? hueChoices(rgb, colors)
          : colors;
      png.data.set([...nearest(rgb, choices), 255], p);
    }
  }
  return png;
}

export function verify(png, colors) {
  const allowed = new Set(colors.map(String));
  let outside = 0;
  let translucent = 0;
  for (let p = 0; p < png.data.length; p += 4) {
    const alpha = png.data[p + 3];
    if (alpha !== 0 && alpha !== 255) translucent++;
    if (alpha && !allowed.has(String([...png.data.subarray(p, p + 3)]))) outside++;
  }
  assert.equal(outside, 0, "调色板外颜色数");
  assert.equal(translucent, 0, "半透明像素");
}

export function cleanIsolated(png, outline, selected, colors) {
  const before = Buffer.from(png.data);
  for (let y = 1; y < png.height - 1; y++) {
    for (let x = 1; x < png.width - 1; x++) {
      const p = (y * png.width + x) * 4;
      const rgb = String([...before.subarray(p, p + 3)]);
      if (!before[p + 3] || rgb === String(outline) || (selected && !selected.has(p))) continue;
      const neighbors = [-png.width, -1, 1, png.width].map((d) => (y * png.width + x + d) * 4);
      if (
        !selected &&
        neighbors.some((n) => before[n + 3] && String([...before.subarray(n, n + 3)]) === rgb)
      )
        continue;
      const counts = new Map();
      for (const n of neighbors) {
        const source = [...before.subarray(n, n + 3)];
        const key = String(colors ? nearest(source, hueChoices(source, colors)) : source);
        if (before[n + 3] && !selected?.has(n) && (selected || key !== String(outline)))
          counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const best = [...counts].sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] >= (selected ? 1 : 2)) png.data.set(best[0].split(",").map(Number), p);
    }
  }
  return png;
}

export function mirror(png) {
  const result = new PNG({ width: png.width, height: png.height });
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const from = (y * png.width + png.width - 1 - x) * 4;
      result.data.set(png.data.subarray(from, from + 4), (y * png.width + x) * 4);
    }
  return result;
}

export function buildFurniture() {
  const colors = palette();
  const manifest = readJson("assets/furniture-manifest.json");
  const atlas = new PNG({ width: 512, height: 512 });
  const before = new PNG({ width: 512, height: 512 });
  const frames = {};
  const images = new Map();
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const entry of manifest.frames) {
    let png;
    let unclean;
    if (entry.mirrorOf) {
      png = mirror(images.get(entry.mirrorOf).png);
      unclean = mirror(images.get(entry.mirrorOf).unclean);
    } else {
      const source = readPng(entry.source);
      removeMagenta(source);
      const cell = crop(source, entry.box);
      png = quantize(resize(crop(cell, bounds(cell)), entry.w, entry.h), colors, entry.materials);
      unclean = crop(png, { x: 0, y: 0, w: png.width, h: png.height });
      cleanIsolated(png, colors[0]);
    }
    images.set(entry.name, { png, unclean });
    for (const group of entry.materials) assert.ok(group.colors.length <= 3);
    verify(
      png,
      entry.materials.flatMap((group) => group.colors.map((i) => colors[i])),
    );
    const parts = entry.parts ?? [{ name: entry.name }];
    for (const part of parts) {
      const image = crop(png, { x: 0, y: 0, w: png.width, h: png.height });
      const previous = crop(unclean, { x: 0, y: 0, w: png.width, h: png.height });
      if (part.rects) {
        for (let py = 0; py < image.height; py++) {
          for (let px = 0; px < image.width; px++) {
            if (
              part.rects.some(
                ([rx, ry, rw, rh]) => px >= rx && py >= ry && px < rx + rw && py < ry + rh,
              ) === Boolean(part.exclude)
            )
              image.data.fill(0, (py * image.width + px) * 4, (py * image.width + px) * 4 + 4);
          }
        }
      }
      if (x + image.width > atlas.width) [x, y, rowHeight] = [0, y + rowHeight + 2, 0];
      assert.ok(y + image.height <= atlas.height);
      paste(atlas, image, x, y);
      for (let p = 3; p < image.data.length; p += 4) previous.data[p] = image.data[p];
      paste(before, previous, x, y);
      frames[part.name] = { frame: { x, y, w: image.width, h: image.height } };
      x += image.width + 2;
      rowHeight = Math.max(rowHeight, image.height);
    }
  }
  verify(atlas, colors);
  savePng("public/furniture.png", atlas);
  savePng("assets/probe/furniture-before-clean@3x.png", resize(before, 1536, 1536));
  savePng("assets/probe/furniture-after-clean@3x.png", resize(atlas, 1536, 1536));
  saveJson("public/furniture.json", { frames, meta: { image: "furniture.png", scale: "1" } });
  saveJson("public/catalog.json", { tile: 32, items: manifest.items });
  console.log(
    `家具 ${Object.keys(frames).length} 帧；调色板外颜色数 0；半透明像素 0；每材质不超过 3 色`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildFurniture();
