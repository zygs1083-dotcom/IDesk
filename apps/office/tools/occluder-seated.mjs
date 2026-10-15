import { resolve } from "node:path";
import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { enlargeCrop, readJson, readPng, root, savePng } from "./occluder-image.mjs";

import { characterLayer, composite, occluderLayers } from "./seated-scene.mjs";

const args = process.argv.slice(2);
const walking = args.includes("--walking");
const typing = args.includes("--typing") || args.includes("--typing-alt");
const typingFrame = args.includes("--typing-alt") ? 1 : 0;
const [output, spritesPng, spritesJson] = args.filter((arg) => !arg.startsWith("--"));
if (!output)
  throw new Error(
    "Usage: node tools/occluder-seated.mjs OUTPUT [SPRITES.png SPRITES.json] [--typing|--typing-alt|--walking]",
  );
const layout = parseOfficeLayout(readJson(`${root}public/layout.json`));
const background = readPng(`${root}assets/raw/background.png`);
const sprites = readPng(spritesPng ?? `${root}public/characters.png`);
const atlas = readJson(spritesJson ?? `${root}public/characters.json`);
const layers = occluderLayers(layout, background);
const actors = walking ? [{ id: "plant-probe", x: 104, y: 408, facing: "down" }] : layout.seats;
for (const seat of actors) {
  const kind = seat.id === layout.reception?.seat ? "receptionist" : "codex";
  const facing = seat.facing === "left" ? "right" : seat.facing;
  const pose = walking
    ? "walk/down/0"
    : typing
      ? `typing/${facing}/${typingFrame}`
      : `sit/${facing}`;
  layers.push(characterLayer(seat, kind, pose, atlas, sprites));
}
composite(background, layers);
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
process.stdout.write(`Seated preview: ${resolve(output)}\n`);
