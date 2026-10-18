import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { PNG } from "pngjs";
import {
  cutPolygon,
  paste,
  readJson,
  readPng,
  root,
  saveJson,
  savePng,
} from "./occluder-image.mjs";

export function buildOccluders() {
  const layout = parseOfficeLayout(readJson(`${root}public/layout.json`));
  const background = readPng(`${root}assets/raw/background.png`);
  assert.equal(background.width, layout.size.w);
  assert.equal(background.height, layout.size.h);
  const pieces = [...layout.occluders]
    .sort((a, b) => a.id.localeCompare(b.id, "en"))
    .map((item) => ({ ...item, ...cutPolygon(background, item.polygon) }));
  const width = Math.max(512, ...pieces.map(({ box }) => box.w));
  let x = 0,
    y = 0,
    height = 0;
  for (const piece of pieces) {
    if (x + piece.box.w > width) {
      x = 0;
      y += height + 2;
      height = 0;
    }
    piece.frame = { x, y, w: piece.box.w, h: piece.box.h };
    x += piece.box.w + 2;
    height = Math.max(height, piece.box.h);
  }
  const frames = {};
  for (const { id, box, frame } of pieces) {
    frames[id] = {
      frame,
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: box.w, h: box.h },
      sourceSize: { w: box.w, h: box.h },
      background: { x: box.x, y: box.y },
    };
  }
  for (const variant of ["", "-dusk", "-night"]) {
    const source = variant ? readPng(`${root}assets/raw/background${variant}.png`) : background;
    assert.equal(source.width, layout.size.w);
    assert.equal(source.height, layout.size.h);
    const atlas = new PNG({ width, height: Math.max(1, y + height) });
    for (const { polygon, frame } of pieces)
      paste(atlas, cutPolygon(source, polygon).png, frame.x, frame.y);
    savePng(`${root}public/occluders${variant}.png`, atlas);
    saveJson(`${root}public/occluders${variant}.json`, {
      frames,
      meta: {
        image: `occluders${variant}.png`,
        format: "RGBA8888",
        size: { w: atlas.width, h: atlas.height },
        scale: "1",
      },
    });
  }
  return pieces.length;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  process.stdout.write(`Occluders: ${buildOccluders()} frames\n`);
