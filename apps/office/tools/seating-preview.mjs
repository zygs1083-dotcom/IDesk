import { PNG } from "pngjs";
import { palette, verify } from "./furniture.mjs";
import {
  bounds,
  crop,
  paste,
  readJson,
  readPng,
  resize,
  saveJson,
  savePng,
} from "./furniture-image.mjs";
import { assertSorting, objects, poses } from "./probe.mjs";
import { composeObjects } from "./probe-previews.mjs";
import { spriteCells } from "./sprite-cells.mjs";

export const kinds = ["claude-code", "codex", "n8n", "script", "custom", "receptionist"];
const factors = [1.05, 1, 0.985, 0.94, 1.04, 1.05];
const atlas = readPng("public/sprites.png");
const frames = readJson("public/sprites.json").frames;
const furniture = readPng("public/furniture.png");
const furnitureFrames = Object.fromEntries(
  Object.entries(readJson("public/furniture.json").frames).map(([name, { frame }]) => [
    name,
    crop(furniture, frame),
  ]),
);
const characters = Object.fromEntries(
  kinds.flatMap((kind) =>
    poses.map((pose) => [`${kind}/${pose}`, crop(atlas, frames[`${kind}/${pose}`].frame)]),
  ),
);
const placements = kinds.flatMap((kind, index) => {
  const x = 1 + (index % 3) * 7;
  const y = 3 + Math.floor(index / 3) * 11;
  return [0, 1].flatMap((typing) => {
    const left = x + typing * 3;
    const id = `${kind}-${typing}`;
    return [
      {
        id: `${id}-down`,
        kind,
        item: "chair-down",
        x: left,
        y,
        pose: typing ? "typing/down/1" : "sit/down",
        desk: `${id}-laptop`,
      },
      { id: `${id}-laptop`, item: "desk-laptop", x: left, y: y + 1 },
      { id: `${id}-monitor`, item: "desk-monitor", x: left, y: y + 4 },
      {
        id: `${id}-up`,
        kind,
        item: "chair-up",
        x: left,
        y: y + 6,
        pose: typing ? "typing/up/1" : "sit/up",
        desk: `${id}-monitor`,
      },
    ];
  });
});
placements.push(
  {
    id: "host",
    kind: "receptionist",
    item: "chair-down",
    x: 9,
    y: 25,
    pose: "typing/down/0",
    desk: "counter",
  },
  { id: "counter", item: "counter", x: 9, y: 26 },
);
const canvas = new PNG({ width: 704, height: 896 });
const tiles = readJson("public/tiles.json");
const tileAtlas = readPng("public/tiles.png");
for (let y = 0; y < 28; y++)
  for (let x = 0; x < 22; x++)
    paste(canvas, crop(tileAtlas, tiles.frames[tiles.codes.w]), x * 32, y * 32);
const list = objects(
  readJson("public/catalog.json").items,
  furnitureFrames,
  characters,
  placements,
);
assertSorting(list, placements);
composeObjects(canvas, list);
verify(canvas, palette());
savePng("assets/probe/front-seating@3x.png", resize(canvas, 2112, 2688));

const headWidth = (png) => {
  const box = bounds(png);
  return bounds(crop(png, { x: box.x, y: box.y, w: box.w, h: Math.floor(box.h / 2) })).w;
};
const measurements = kinds.flatMap((kind, index) => {
  const standing = spriteCells(
    readPng(`assets/raw/${kind}.png`),
    5,
    Array.from({ length: 19 }, (_, i) => String(i)),
    kind,
  )[0].png;
  const seated = spriteCells(readPng(`assets/raw/${kind}-seated-front.png`), 2, poses, kind);
  const worldStanding = crop(atlas, frames[`${kind}/walk/down/0`].frame);
  return seated.map(({ name, png }) => {
    const world = characters[`${kind}/${name}`];
    return {
      kind,
      pose: name,
      factor: factors[index],
      standing: standing.height,
      seated: png.height,
      ratio: png.height / standing.height,
      standingHead: headWidth(standing),
      head: headWidth(png),
      headDifference: headWidth(png) / headWidth(standing) - 1,
      worldStanding: bounds(worldStanding).h,
      worldSeated: bounds(world).h,
      worldRatio: bounds(world).h / bounds(worldStanding).h,
      worldStandingHead: headWidth(worldStanding),
      worldHead: headWidth(world),
      worldHeadDifference: headWidth(world) / headWidth(worldStanding) - 1,
    };
  });
});
saveJson("assets/probe/front-seating-measurements.json", measurements);
console.log(
  `正面坐姿预览 ${placements.filter((p) => p.pose).length} 人；排序通过；比例 ${measurements.length} 帧`,
);
