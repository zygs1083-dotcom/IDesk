import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { removeMagenta } from "./sprite-cells.mjs";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const readPng = (path) => PNG.sync.read(readFileSync(`${root}${path}`));
export const savePng = (path, png) => writeFileSync(`${root}${path}`, PNG.sync.write(png));
export const readJson = (path) => JSON.parse(readFileSync(`${root}${path}`, "utf8"));
export const saveJson = (path, data) =>
  writeFileSync(`${root}${path}`, `${JSON.stringify(data, null, 2)}\n`);
export const palette = () => {
  const png = readPng("assets/palette.png");
  assert.equal(png.width, 32);
  assert.equal(png.height, 1);
  const colors = Array.from({ length: 32 }, (_, i) => [...png.data.subarray(i * 4, i * 4 + 3)]);
  assert.equal(new Set(colors.map(String)).size, 32);
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

export function quantize(png, colors) {
  for (let p = 0; p < png.data.length; p += 4) {
    if (png.data[p + 3] < 128) png.data.fill(0, p, p + 4);
    else png.data.set([...nearest(png.data.subarray(p, p + 3), colors), 255], p);
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

export function crop(png, { x, y, w, h }) {
  const result = new PNG({ width: w, height: h });
  PNG.bitblt(png, result, x, y, w, h, 0, 0);
  return result;
}

export function bounds(png) {
  let x = png.width;
  let y = png.height;
  let right = -1;
  let bottom = -1;
  for (let j = 0; j < png.height; j++) {
    for (let i = 0; i < png.width; i++) {
      if (!png.data[(j * png.width + i) * 4 + 3]) continue;
      x = Math.min(x, i);
      y = Math.min(y, j);
      right = Math.max(right, i);
      bottom = Math.max(bottom, j);
    }
  }
  assert.ok(right >= x, "empty frame");
  return { x, y, w: right - x + 1, h: bottom - y + 1 };
}

export function resize(png, w, h) {
  const result = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const from =
        (Math.floor(((y + 1) * png.height - 1) / h) * png.width +
          Math.floor(((x + 1) * png.width - 1) / w)) *
        4;
      result.data.set(png.data.subarray(from, from + 4), (y * w + x) * 4);
    }
  }
  return result;
}

export function paste(canvas, png, left, top) {
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (x + left < 0 || y + top < 0 || x + left >= canvas.width || y + top >= canvas.height)
        continue;
      const from = (y * png.width + x) * 4;
      if (png.data[from + 3])
        canvas.data.set(
          png.data.subarray(from, from + 4),
          ((y + top) * canvas.width + x + left) * 4,
        );
    }
  }
}

export function buildFurniture() {
  const colors = palette();
  const manifest = readJson("assets/furniture-manifest.json");
  const atlas = new PNG({ width: 512, height: 256 });
  const frames = {};
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const entry of manifest.frames) {
    const source = readPng(entry.source);
    removeMagenta(source);
    const cell = crop(source, entry.box);
    const png = quantize(resize(crop(cell, bounds(cell)), entry.w, entry.h), colors);
    const parts = entry.parts ?? [{ name: entry.name }];
    for (const part of parts) {
      const image = crop(png, { x: 0, y: 0, w: png.width, h: png.height });
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
      frames[part.name] = { frame: { x, y, w: image.width, h: image.height } };
      x += image.width + 2;
      rowHeight = Math.max(rowHeight, image.height);
    }
  }
  verify(atlas, colors);
  savePng("public/furniture.png", atlas);
  saveJson("public/furniture.json", { frames, meta: { image: "furniture.png", scale: "1" } });
  saveJson("public/catalog.json", { tile: 32, items: manifest.items });
  console.log(`家具 ${Object.keys(frames).length} 帧；调色板外颜色数 0；半透明像素 0`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildFurniture();
