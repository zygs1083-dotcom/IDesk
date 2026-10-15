import { resolve } from "node:path";
import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { PNG } from "pngjs";
import { zIndexOf } from "../src/world/sort.ts";
import {
  cutPolygon,
  enlargeCrop,
  paste,
  readJson,
  readPng,
  root,
  savePng,
} from "./occluder-image.mjs";

const [output, spritesPng, spritesJson] = process.argv.slice(2);
if (!output)
  throw new Error("Usage: node tools/occluder-seated.mjs OUTPUT [SPRITES.png SPRITES.json]");
const layout = parseOfficeLayout(readJson(`${root}assets/layout.json`));
const background = readPng(`${root}assets/raw/background.png`);
const sprites = readPng(spritesPng ?? `${root}public/characters.png`);
const atlas = readJson(spritesJson ?? `${root}public/characters.json`);
const layers = layout.occluders.map((item) => {
  const { png, box } = cutPolygon(background, item.polygon);
  return { png, x: box.x, y: box.y, z: zIndexOf(item.baseline, 0) };
});
for (const seat of layout.seats) {
  const frame = atlas.frames[`codex/sit/${seat.facing}`].frame;
  const png = new PNG({ width: frame.w, height: frame.h });
  for (let y = 0; y < frame.h; y++)
    for (let x = 0; x < frame.w; x++) {
      const sourceX = seat.mirror ? frame.w - 1 - x : x;
      const from = ((y + frame.y) * sprites.width + sourceX + frame.x) * 4;
      png.data.set(sprites.data.subarray(from, from + 4), (y * frame.w + x) * 4);
    }
  layers.push({
    png,
    x: Math.round(seat.x - frame.w / 2),
    y: Math.round(seat.y - frame.h),
    z: zIndexOf(seat.y, 1),
  });
}
for (const layer of layers.sort((a, b) => a.z - b.z))
  paste(background, layer.png, layer.x, layer.y);
for (const zone of layout.zones) {
  const seats = layout.seats.filter((seat) => zone.seats.includes(seat.id));
  const x = Math.max(0, Math.min(...seats.map((seat) => seat.x)) - 100);
  const y = Math.max(0, Math.min(...seats.map((seat) => seat.y)) - 140);
  const w = Math.min(background.width - x, Math.max(...seats.map((seat) => seat.x)) + 100 - x);
  const h = Math.min(background.height - y, Math.max(...seats.map((seat) => seat.y)) + 40 - y);
  savePng(resolve(output, `${zone.id}-seated@3x.png`), enlargeCrop(background, { x, y, w, h }));
}
console.log(`Seated preview: ${resolve(output)}`);
