import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import {
  bounds,
  crop,
  palette,
  paste,
  quantize,
  readJson,
  readPng,
  resize,
  saveJson,
  savePng,
  verify,
} from "./furniture.mjs";
import { spriteCells } from "./sprite-cells.mjs";

export const poses = [
  "sit/down",
  "typing/down/0",
  "typing/down/1",
  "sit/up",
  "typing/up/0",
  "typing/up/1",
];
export const placements = [
  { id: "north-west", item: "chair-down", x: 5, y: 3, pose: "sit/down", desk: "laptop-west" },
  { id: "north-east", item: "chair-down", x: 8, y: 3, pose: "typing/down/0", desk: "laptop-east" },
  { id: "laptop-west", item: "desk-laptop", x: 5, y: 4 },
  { id: "laptop-east", item: "desk-laptop", x: 8, y: 4 },
  { id: "monitor-west", item: "desk-monitor", x: 5, y: 5 },
  { id: "monitor-east", item: "desk-monitor", x: 8, y: 5 },
  { id: "south-west", item: "chair-up", x: 5, y: 6, pose: "sit/up", desk: "monitor-west" },
  { id: "south-east", item: "chair-up", x: 8, y: 6, pose: "typing/up/1", desk: "monitor-east" },
  { id: "host", item: "chair-down", x: 1, y: 7, pose: "typing/down/1", desk: "reception" },
  { id: "reception", item: "counter", x: 1, y: 8 },
  { id: "fern", item: "plant", x: 11, y: 8 },
  { id: "books", item: "bookshelf", x: 11, y: 3 },
  { id: "sign", item: "plaque", x: 8, y: 0 },
];

export function people() {
  const atlas = readPng("public/sprites.png");
  const frame = readJson("public/sprites.json").frames["codex/walk/down/0"].frame;
  const standing = crop(atlas, frame);
  const original = spriteCells(
    readPng("assets/raw/codex.png"),
    5,
    Array.from({ length: 19 }, (_, i) => String(i)),
    "codex",
  )[0].png;
  const scale = bounds(standing).h / original.height;
  const cells = spriteCells(readPng("assets/raw/probe/codex-seated-front.png"), 2, poses, "probe");
  const result = { standing };
  for (const cell of cells) {
    const png = resize(
      cell.png,
      Math.round(cell.png.width * scale),
      Math.round(cell.png.height * scale),
    );
    const frame = new PNG({ width: 64, height: 96 });
    paste(frame, png, Math.floor((64 - png.width) / 2), 96 - png.height);
    result[cell.name] = frame;
  }
  return result;
}

export function objects(items, frames, characters) {
  return placements.flatMap((placement) => {
    const item = items[placement.item];
    const parts = item.parts.map((part) => ({
      id: placement.id,
      frame: part.frame,
      layer: item.layer,
      sortY: placement.y * 32 + part.sortY,
      bias: part.bias,
      png: frames[part.frame],
      x: placement.x * 32 + part.dx,
      y: placement.y * 32 + part.dy,
    }));
    if (placement.pose)
      parts.push({
        id: placement.id,
        frame: "person",
        layer: "object",
        sortY: placement.y * 32 + item.seat.y,
        bias: 0,
        png: characters[placement.pose],
        x: placement.x * 32 + item.seat.x - 32,
        y: placement.y * 32 + item.seat.y - 96,
      });
    return parts;
  });
}

export function assertSorting(list) {
  for (const placement of placements.filter((p) => p.pose)) {
    const parts = list.filter((part) => part.id === placement.id);
    const y = (name) => parts.find((part) => part.frame.endsWith(name)).sortY;
    assert.ok(y("behind") < y("person") && y("person") < y("front"));
    const desk = list.find((part) => part.id === placement.desk);
    assert.ok(placement.item === "chair-up" ? desk.sortY < y("person") : y("person") < desk.sortY);
  }
}

export function buildProbe() {
  const colors = palette();
  const tiles = readJson("public/tiles.json");
  const tileAtlas = readPng("public/tiles.png");
  const furniture = readJson("public/furniture.json");
  const atlas = readPng("public/furniture.png");
  const frames = Object.fromEntries(
    Object.entries(furniture.frames).map(([name, { frame }]) => [name, crop(atlas, frame)]),
  );
  const characters = people();
  const comparison = new PNG({ width: 256, height: 96 });
  paste(comparison, characters.standing, 0, 0);
  paste(comparison, characters["sit/down"], 128, 0);
  for (const png of Object.values(characters)) quantize(png, colors);
  paste(comparison, characters.standing, 64, 0);
  paste(comparison, characters["sit/down"], 192, 0);
  savePng("assets/probe/characters-before-after@3x.png", resize(comparison, 768, 288));
  const canvas = new PNG({ width: 448, height: 320 });
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 14; x++) {
      const code =
        y === 0
          ? x === 3
            ? "N"
            : x === 4
              ? "O"
              : "U"
          : y === 1
            ? "L"
            : x >= 4 && x <= 10 && y >= 3 && y <= 7
              ? "c"
              : x < 4 && y > 6
                ? "t"
                : "w";
      paste(canvas, crop(tileAtlas, tiles.frames[tiles.codes[code]]), x * 32, y * 32);
    }
  }
  const list = objects(readJson("public/catalog.json").items, frames, characters);
  assertSorting(list);
  const wall = list.filter((part) => part.layer === "wall");
  const sorted = list
    .filter((part) => part.layer !== "wall")
    .sort((a, b) => a.sortY - b.sortY || a.bias - b.bias);
  for (const part of [...wall, ...sorted]) paste(canvas, part.png, part.x, part.y);
  verify(canvas, colors);
  savePng("assets/probe/probe.png", canvas);
  savePng("assets/probe/probe@3x.png", resize(canvas, 1344, 960));
  const ruler = new PNG({ width: 320, height: 128 });
  for (let y = 0; y < ruler.height; y++) {
    for (let x = 0; x < ruler.width; x++)
      ruler.data.set(
        [...colors[x % 32 === 0 || y % 32 === 0 ? 8 : 6], 255],
        (y * ruler.width + x) * 4,
      );
  }
  paste(ruler, characters.standing, 0, 0);
  paste(ruler, characters["sit/down"], 64, 0);
  paste(ruler, frames["desk-laptop"], 144, 96 - frames["desk-laptop"].height);
  for (const suffix of ["behind", "front"])
    paste(ruler, frames[`chair-down-${suffix}`], 240, 96 - 40);
  verify(ruler, colors);
  savePng("assets/probe/ruler@3x.png", resize(ruler, 960, 384));
  savePng("assets/probe/palette@12x.png", resize(readPng("assets/palette.png"), 384, 12));
  const measurements = {
    standing: bounds(characters.standing),
    seated: Object.fromEntries(poses.map((pose) => [pose, bounds(characters[pose])])),
    deskTopHeight: 52,
    chairBackHeight: 40,
  };
  saveJson("assets/probe/measurements.json", measurements);
  console.log("探针 14×10 格，5 人排序通过；调色板外颜色数 0；半透明像素 0");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildProbe();
