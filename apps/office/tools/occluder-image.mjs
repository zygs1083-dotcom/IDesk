import { contains } from "@idesk/shared/office-geometry";
import { PNG } from "pngjs";
import { pixel } from "./image.mjs";

export { contains } from "@idesk/shared/office-geometry";
export { paste, pixel, readJson, readPng, root, saveJson, savePng } from "./image.mjs";

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
