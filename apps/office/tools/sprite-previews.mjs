import { PNG } from "pngjs";
import { crop, paste, resize, saveJson, savePng } from "./furniture-image.mjs";
import { errors } from "./palette.mjs";

export function characterPreviews(before, after, frames, kinds, colors) {
  const comparison = new PNG({ width: 384, height: 96 * kinds.length });
  const histogram = new Map();
  for (let p = 0; p < before.data.length; p += 4) {
    if (before.data[p + 3] < 128) continue;
    const rgb = [...before.data.subarray(p, p + 3)];
    const key = String(rgb);
    const point = histogram.get(key) ?? { rgb, weight: 0 };
    point.weight++;
    histogram.set(key, point);
  }
  for (const [row, kind] of kinds.entries()) {
    const faces = new PNG({ width: 128, height: 48 });
    for (const [col, pose] of ["walk/down/0", "sit/down", "sit/up"].entries()) {
      for (const [version, atlas] of [before, after].entries()) {
        const png = crop(atlas, frames[`${kind}/${pose}`].frame);
        paste(comparison, png, (col * 2 + version) * 64, row * 96);
        if (col === 1) paste(faces, crop(png, { x: 0, y: 12, w: 64, h: 48 }), version * 64, 0);
      }
    }
    savePng(`assets/probe/front-seating-face-${kind}@6x.png`, resize(faces, 768, 288));
  }
  savePng("assets/probe/front-seating-before-after@3x.png", resize(comparison, 1152, 1728));
  const error = errors([...histogram.values()], colors);
  saveJson("assets/probe/front-seating-error.json", error);
  return error;
}
