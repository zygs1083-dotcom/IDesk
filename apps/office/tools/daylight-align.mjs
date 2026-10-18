import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { outline, readJson, readPng, root, savePng } from "./occluder-image.mjs";

const regions = {
  windowFrame: [5, 5, 112, 355],
  whiteboard: [205, 5, 230, 145],
  wallClock: [450, 5, 65, 70],
  wallCabinets: [520, 10, 455, 120],
  bookshelf: [995, 5, 145, 130],
  meeting: [1220, 105, 390, 245],
  reception: [45, 545, 325, 195],
  desksNorthWest: [440, 205, 340, 220],
  desksNorthEast: [825, 205, 340, 220],
  desksSouthWest: [430, 505, 350, 230],
  desksSouthEast: [825, 505, 350, 230],
  lounge: [1250, 370, 390, 300],
  entrance: [1300, 675, 365, 255],
};

function edges(png) {
  const { width, height, data } = png;
  const result = new Uint8Array(width * height);
  const shade = (i) => (data[i] * 3 + data[i + 1] * 4 + data[i + 2]) >> 3;
  for (let y = 0; y < height - 1; y++)
    for (let x = 0; x < width - 1; x++) {
      const p = (y * width + x) * 4;
      result[y * width + x] = Math.min(
        255,
        Math.abs(shade(p) - shade(p + 4)) + Math.abs(shade(p) - shade(p + width * 4)),
      );
    }
  return result;
}

function offset(a, b, width, [left, top, regionWidth, regionHeight]) {
  let best = { dx: 0, dy: 0, score: -1 };
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      let product = 0,
        magnitudeA = 0,
        magnitudeB = 0;
      for (let y = top + 5; y < top + regionHeight - 5; y += 2)
        for (let x = left + 5; x < left + regionWidth - 5; x += 2) {
          const original = a[y * width + x];
          const variant = b[(y + dy) * width + x + dx];
          product += original * variant;
          magnitudeA += original * original;
          magnitudeB += variant * variant;
        }
      const score = product / Math.sqrt(magnitudeA * magnitudeB);
      if (score > best.score) best = { dx, dy, score };
    }
  return best;
}

export function checkAlignment(output) {
  const layout = readJson(`${root}public/layout.json`);
  const sources = ["", "-dusk", "-night"].map((variant) =>
    readPng(`${root}assets/raw/background${variant}.png`),
  );
  const edgeMaps = sources.map(edges);
  const results = {};
  for (const [index, variant] of ["dusk", "night"].entries()) {
    const rows = Object.entries(regions).map(([region, box]) => ({
      region,
      ...offset(edgeMaps[0], edgeMaps[index + 1], sources[0].width, box),
    }));
    results[variant] = {
      maxOffset: Math.max(...rows.map(({ dx, dy }) => Math.max(Math.abs(dx), Math.abs(dy)))),
      regions: rows,
    };
    assert.ok(results[variant].maxOffset <= 2, `${variant} exceeds 2px alignment`);
  }
  const atlas = readJson(`${root}public/occluders.json`);
  const mask = readPng(`${root}public/occluders.png`);
  for (const variant of ["dusk", "night"]) {
    const otherAtlas = readJson(`${root}public/occluders-${variant}.json`);
    const otherMask = readPng(`${root}public/occluders-${variant}.png`);
    assert.deepEqual(otherAtlas.frames, atlas.frames);
    assert.equal(otherMask.width, mask.width);
    assert.equal(otherMask.height, mask.height);
    for (let index = 3; index < mask.data.length; index += 4)
      assert.equal(otherMask.data[index], mask.data[index]);
  }
  const { width, height } = sources[0];
  const outputImage = new PNG({ width: width * 3, height });
  for (const [index, source] of sources.entries()) {
    for (const item of layout.occluders) outline(source, item.polygon, [0, 255, 255, 255]);
    for (let y = 0; y < height; y++)
      source.data.copy(
        outputImage.data,
        (y * outputImage.width + index * width) * 4,
        y * width * 4,
        (y + 1) * width * 4,
      );
  }
  savePng(resolve(output), outputImage);
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error("Usage: node tools/daylight-align.mjs OUTPUT.png");
  process.stdout.write(`${JSON.stringify(checkAlignment(process.argv[2]), null, 2)}\n`);
}
