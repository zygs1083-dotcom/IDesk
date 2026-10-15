import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
export const readPng = (path) => PNG.sync.read(readFileSync(path));
export function savePng(path, png) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
}
export function saveJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
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
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const from = (y * png.width + x) * 4;
      if (png.data[from + 3])
        pixel(canvas, x + left, y + top, [...png.data.subarray(from, from + 4)]);
    }
}

export function pixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const p = (y * png.width + x) * 4;
  const alpha = color[3] / 255;
  for (let c = 0; c < 3; c++)
    png.data[p + c] = Math.round(color[c] * alpha + png.data[p + c] * (1 - alpha));
  png.data[p + 3] = 255;
}
