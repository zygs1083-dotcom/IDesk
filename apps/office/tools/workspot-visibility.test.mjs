import { PNG } from "pngjs";
import { expect, test } from "vitest";
import { atlas, outfitIds, sprites } from "./character-atlases.mjs";
import { readJson, readPng, root } from "./image.mjs";
import { characterLayer, composite, occluderLayers } from "./seated-scene.mjs";

const layout = readJson(`${root}public/layout.json`);
const background = readPng(`${root}assets/raw/background.png`);
const kinds = outfitIds.filter((id) => id !== "receptionist");
const visible = new Uint8Array(background.width * background.height);

function silhouette(layer, value) {
  const png = new PNG({ width: layer.png.width, height: layer.png.height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data.fill(value, i, i + 3);
    png.data[i + 3] = layer.png.data[i + 3];
  }
  return { ...layer, png };
}

const objects = occluderLayers(layout, background).map((layer) => silhouette(layer, 0));
for (const kind of kinds) {
  for (const action of ["sit", "typing/0", "typing/1"]) {
    const actors = layout.seats.map((seat) => {
      const facing = seat.facing === "left" ? "right" : seat.facing;
      const [name, frame] = action.split("/");
      const pose = `${name}/${facing}${frame === undefined ? "" : `/${frame}`}`;
      const actor = seat.id === layout.reception.seat ? "receptionist" : kind;
      return silhouette(characterLayer(seat, actor, pose, atlas, sprites), 255);
    });
    const mask = composite(new PNG({ width: background.width, height: background.height }), [
      ...objects,
      ...actors,
    ]);
    for (let i = 0; i < visible.length; i++) visible[i] |= mask.data[i * 4];
  }
}

function intersections(point, halfWidth, halfHeight) {
  const hits = [];
  for (let y = point.y - halfHeight; y <= point.y + halfHeight; y++)
    for (let x = point.x - halfWidth; x <= point.x + halfWidth; x++)
      if (visible[y * background.width + x]) hits.push(`${x},${y}`);
  return hits;
}

test.each(layout.seats)(
  "$id: card and warm-light center avoid all visible seated pixels",
  (seat) => {
    expect(intersections(seat.workSpot, 17, 11), "card rectangle").toEqual([]);
    expect(intersections(seat.workSpot, 0, 0), "warm-light center").toEqual([]);
  },
);

test("26/26 seats and the shared meeting card are covered", () => {
  expect(layout.seats).toHaveLength(26);
  expect(intersections(layout.meeting.workSpot, 17, 11)).toEqual([]);
});
