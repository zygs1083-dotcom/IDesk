import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseOfficeLayout } from "@idesk/shared/office-layout";
import {
  enlargeCrop,
  line,
  outline,
  pixel,
  polygonBounds,
  readJson,
  readPng,
  rectangle,
  root,
  savePng,
} from "./occluder-image.mjs";

export function overlay(output, grid = false) {
  const layout = parseOfficeLayout(readJson(`${root}public/layout.json`));
  const png = readPng(`${root}assets/raw/background.png`);
  if (grid)
    for (let y = 0; y < png.height; y++)
      for (let x = 0; x < png.width; x++)
        if (layout.grid.rows[Math.floor(y / 16)][Math.floor(x / 16)] === "#")
          pixel(png, x, y, [255, 60, 60, 70]);
  for (const occluder of layout.occluders) {
    outline(png, occluder.polygon, [0, 255, 255, 255]);
    const box = polygonBounds(occluder.polygon);
    line(png, [box.x, occluder.baseline], [box.x + box.w, occluder.baseline], [255, 0, 255, 255]);
  }
  for (const seat of layout.seats) {
    line(png, [seat.x - 4, seat.y], [seat.x + 4, seat.y], [255, 255, 0, 255]);
    line(png, [seat.x, seat.y - 4], [seat.x, seat.y + 4], [255, 255, 0, 255]);
    rectangle(
      png,
      { x: seat.workSpot.x - 2, y: seat.workSpot.y - 2, w: 4, h: 4 },
      [0, 255, 0, 255],
    );
  }
  for (const zone of layout.zones) {
    rectangle(png, zone.plaque, [255, 128, 0, 255]);
    const seats = layout.seats.filter((seat) => zone.seats.includes(seat.id));
    const xs = [...seats.map((s) => s.x), zone.plaque.x, zone.plaque.x + zone.plaque.w];
    const ys = [...seats.map((s) => s.y), zone.plaque.y, zone.plaque.y + zone.plaque.h];
    const x = Math.max(0, Math.floor(Math.min(...xs) - 90));
    const y = Math.max(0, Math.floor(Math.min(...ys) - 40));
    const w = Math.min(png.width - x, Math.ceil(Math.max(...xs) + 90 - x));
    const h = Math.min(png.height - y, Math.ceil(Math.max(...ys) + 40 - y));
    savePng(resolve(output, `${zone.id}@3x.png`), enlargeCrop(png, { x, y, w, h }));
  }
  rectangle(png, layout.board, [255, 128, 0, 255]);
  for (const [positions, color] of [
    [Object.values(layout.points ?? {}), [255, 255, 255, 255]],
    [layout.spots ?? [], [0, 100, 255, 255]],
    [layout.standing ?? [], [255, 180, 0, 255]],
  ])
    for (const point of positions) {
      line(png, [point.x - 5, point.y], [point.x + 5, point.y], color);
      line(png, [point.x, point.y - 5], [point.x, point.y + 5], color);
    }
  for (const [id, box] of [
    ["reception", { x: 0, y: 540, w: 375, h: 240 }],
    ["meeting", { x: 1230, y: 100, w: 385, h: 245 }],
    ["lounge", { x: 1250, y: 360, w: 422, h: 320 }],
    ["misc", { x: 40, y: 315, w: 140, h: 175 }],
  ])
    savePng(resolve(output, `${id}@3x.png`), enlargeCrop(png, box));
  savePng(
    resolve(output, "overview@3x.png"),
    enlargeCrop(png, { x: 0, y: 0, w: png.width, h: png.height }),
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error("Usage: node tools/occluder-overlay.mjs OUTPUT [--grid]");
  overlay(process.argv[2], process.argv.includes("--grid"));
  process.stdout.write(`Overlay: ${resolve(process.argv[2])}\n`);
}
