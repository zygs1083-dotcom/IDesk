import { PNG } from "pngjs";
import { zIndexOf } from "../src/world/sort.ts";
import { cutPolygon, paste } from "./occluder-image.mjs";

export function occluderLayers(layout, background) {
  return layout.occluders.map((item) => {
    const { png, box } = cutPolygon(background, item.polygon);
    return { png, x: box.x, y: box.y, z: zIndexOf(item.baseline, 0) };
  });
}

export function characterLayer(seat, kind, pose, atlas, sprites) {
  const { frame, anchor } = atlas.frames[`${kind}/${pose}`];
  const mirror = seat.mirror || seat.facing === "left";
  const png = new PNG({ width: frame.w, height: frame.h });
  for (let y = 0; y < frame.h; y++)
    for (let x = 0; x < frame.w; x++) {
      const sourceX = mirror ? frame.w - 1 - x : x;
      const from = ((y + frame.y) * sprites.width + sourceX + frame.x) * 4;
      png.data.set(sprites.data.subarray(from, from + 4), (y * frame.w + x) * 4);
    }
  return {
    png,
    x: Math.round(seat.x - frame.w * (mirror ? 1 - anchor.x : anchor.x)),
    y: Math.round(seat.y - frame.h * anchor.y),
    z: zIndexOf(seat.y, 1),
  };
}

export function composite(background, layers) {
  for (const layer of layers.toSorted((a, b) => a.z - b.z))
    paste(background, layer.png, layer.x, layer.y);
  return background;
}
