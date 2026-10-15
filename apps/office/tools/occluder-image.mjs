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
export function contains(polygon, x, y) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[j];
    if (
      (x - ax) * (by - ay) === (y - ay) * (bx - ax) &&
      x >= Math.min(ax, bx) &&
      x <= Math.max(ax, bx) &&
      y >= Math.min(ay, by) &&
      y <= Math.max(ay, by)
    )
      return true;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
export function polygonBounds(polygon) {
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  const x = Math.floor(Math.min(...xs));
  const y = Math.floor(Math.min(...ys));
  return { x, y, w: Math.ceil(Math.max(...xs)) - x, h: Math.ceil(Math.max(...ys)) - y };
}
export function cutPolygon(background, polygon) {
  const box = polygonBounds(polygon);
  const png = new PNG({ width: box.w, height: box.h });
  for (let y = 0; y < box.h; y++)
    for (let x = 0; x < box.w; x++) {
      if (!contains(polygon, x + box.x + 0.5, y + box.y + 0.5)) continue;
      const p = ((y + box.y) * background.width + x + box.x) * 4;
      png.data.set(background.data.subarray(p, p + 3), (y * box.w + x) * 4);
      png.data[(y * box.w + x) * 4 + 3] = 255;
    }
  return { png, box };
}
export function pixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const p = (y * png.width + x) * 4;
  const alpha = color[3] / 255;
  for (let c = 0; c < 3; c++)
    png.data[p + c] = Math.round(color[c] * alpha + png.data[p + c] * (1 - alpha));
  png.data[p + 3] = 255;
}
export function line(png, a, b, color) {
  let [x, y] = a.map(Math.round);
  const [bx, by] = b.map(Math.round);
  const dx = Math.abs(bx - x),
    dy = -Math.abs(by - y);
  const sx = x < bx ? 1 : -1,
    sy = y < by ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    pixel(png, x, y, color);
    if (x === bx && y === by) break;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x += sx;
    }
    if (twice <= dx) {
      error += dx;
      y += sy;
    }
  }
}
export function outline(png, polygon, color) {
  polygon.forEach((p, i) => {
    line(png, p, polygon[(i + 1) % polygon.length], color);
  });
}
export function rectangle(png, { x, y, w, h }, color) {
  outline(
    png,
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    color,
  );
}
export function enlargeCrop(png, { x, y, w, h }, scale = 3) {
  const result = new PNG({ width: w * scale, height: h * scale });
  for (let py = 0; py < result.height; py++)
    for (let px = 0; px < result.width; px++) {
      const from = ((Math.floor(py / scale) + y) * png.width + Math.floor(px / scale) + x) * 4;
      result.data.set(png.data.subarray(from, from + 4), (py * result.width + px) * 4);
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
