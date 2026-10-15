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

const args = process.argv.slice(2);
const walking = args.includes("--walking");
const typing = args.includes("--typing") || args.includes("--typing-alt");
const typingFrame = args.includes("--typing-alt") ? 1 : 0;
const [output, spritesPng, spritesJson] = args.filter((arg) => !arg.startsWith("--"));
if (!output)
  throw new Error(
    "Usage: node tools/occluder-seated.mjs OUTPUT [SPRITES.png SPRITES.json] [--typing|--typing-alt|--walking]",
  );
const layout = parseOfficeLayout(readJson(`${root}assets/layout.json`));
const background = readPng(`${root}assets/raw/background.png`);
const sprites = readPng(spritesPng ?? `${root}public/characters.png`);
const atlas = readJson(spritesJson ?? `${root}public/characters.json`);
const layers = layout.occluders.map((item) => {
  const { png, box } = cutPolygon(background, item.polygon);
  return { png, x: box.x, y: box.y, z: zIndexOf(item.baseline, 0) };
});
const actors = walking ? [{ id: "plant-probe", x: 104, y: 408, facing: "down" }] : layout.seats;
for (const seat of actors) {
  const kind = seat.id === layout.reception?.seat ? "receptionist" : "codex";
  const facing = seat.facing === "left" ? "right" : seat.facing;
  const pose = walking
    ? "walk/down/0"
    : typing
      ? `typing/${facing}/${typingFrame}`
      : `sit/${facing}`;
  const { frame, anchor } = atlas.frames[`${kind}/${pose}`];
  const png = new PNG({ width: frame.w, height: frame.h });
  for (let y = 0; y < frame.h; y++)
    for (let x = 0; x < frame.w; x++) {
      const sourceX = seat.mirror ? frame.w - 1 - x : x;
      const from = ((y + frame.y) * sprites.width + sourceX + frame.x) * 4;
      png.data.set(sprites.data.subarray(from, from + 4), (y * frame.w + x) * 4);
    }
  layers.push({
    png,
    x: Math.round(seat.x - frame.w * (seat.mirror ? 1 - anchor.x : anchor.x)),
    y: Math.round(seat.y - frame.h * anchor.y),
    z: zIndexOf(seat.y, 1),
  });
}
for (const layer of layers.sort((a, b) => a.z - b.z))
  paste(background, layer.png, layer.x, layer.y);
if (walking)
  savePng(
    resolve(output, "misc-behind@3x.png"),
    enlargeCrop(background, { x: 40, y: 290, w: 150, h: 190 }),
  );
const groups = [
  ...layout.zones,
  ...(layout.reception ? [{ id: "reception", seats: [layout.reception.seat] }] : []),
  ...(layout.meeting ? [{ id: "meeting", seats: layout.meeting.seats }] : []),
  ...(layout.lounge ? [{ id: "lounge", seats: layout.lounge }] : []),
];
for (const zone of groups) {
  const seats = layout.seats.filter((seat) => zone.seats.includes(seat.id));
  const x = Math.max(0, Math.min(...seats.map((seat) => seat.x)) - 100);
  const y = Math.max(0, Math.min(...seats.map((seat) => seat.y)) - 140);
  const w = Math.min(background.width - x, Math.max(...seats.map((seat) => seat.x)) + 100 - x);
  const h = Math.min(background.height - y, Math.max(...seats.map((seat) => seat.y)) + 40 - y);
  savePng(resolve(output, `${zone.id}-seated@3x.png`), enlargeCrop(background, { x, y, w, h }));
}
savePng(
  resolve(output, "seated-overview@3x.png"),
  enlargeCrop(background, { x: 0, y: 0, w: background.width, h: background.height }),
);
console.log(`Seated preview: ${resolve(output)}`);
