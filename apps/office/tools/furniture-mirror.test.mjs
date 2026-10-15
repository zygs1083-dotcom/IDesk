import { expect, test } from "vitest";
import { mirror } from "./furniture.mjs";
import { crop, readJson, readPng } from "./furniture-image.mjs";

const atlas = readPng("public/furniture.png");
const { frames } = readJson("public/furniture.json");
const { items } = readJson("public/catalog.json");
test("side chairs mirror every RGBA pixel in both parts and seat anchors", () => {
  const left = items["chair-left"];
  const right = items["chair-right"];
  expect(right.seat.x).toBe(left.footprint.w * 32 - left.seat.x);
  expect(right.seat.y).toBe(left.seat.y);
  for (const [i, part] of left.parts.entries()) {
    const source = crop(atlas, frames[part.frame].frame);
    const target = crop(atlas, frames[right.parts[i].frame].frame);
    expect(target.height).toBe(44);
    expect(target.data.equals(mirror(source).data)).toBe(true);
    expect(right.parts[i].dx).toBe(left.footprint.w * 32 - part.dx - source.width);
    expect(right.parts[i].sortY).toBe(part.sortY);
  }
});
