import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { PNG } from "pngjs";
import { palette, quantize } from "./furniture.mjs";
import { crop, paste, readJson, readPng, resize } from "./furniture-image.mjs";
import { people } from "./probe.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/data/cache/ms-playwright";
const { chromium } = createRequire("/data/tools/playwright/package.json")("playwright");
const url = new URL(process.argv[2]);
url.searchParams.set("world", "1");
url.searchParams.set("fill", "1");
const output = resolve(process.argv[3] ?? "office-check");
mkdirSync(output, { recursive: true });
const suffix = process.argv[4] ? `-${process.argv[4]}` : "";
const save = (name, png) => writeFileSync(`${output}/${name}${suffix}.png`, PNG.sync.write(png));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(url.href);
await page.locator('canvas[data-ready="true"]').waitFor();
await page.screenshot({ path: `${output}/panorama-1440x900${suffix}.png` });
const layout = await page.evaluate(async () => (await fetch("/office/layout.json")).json());
const catalog = await page.evaluate(async () => (await fetch("/office/catalog.json")).json());
const width = layout.size.w * 32;
const height = layout.size.h * 32;
await page.setViewportSize({ width, height });
await page.waitForFunction(() => {
  const canvas = document.querySelector("canvas");
  return canvas.width === window.innerWidth && canvas.height === window.innerHeight;
});
await page.evaluate(
  () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
);
const panorama = PNG.sync.read(
  await page.screenshot({ path: `${output}/panorama-1x${suffix}.png` }),
);
const groups = layout.zones.map((zone) => ({
  id: zone.id,
  ids: [...zone.desks, ...zone.chairs, zone.plaque],
}));
groups.push(
  { id: "reception", ids: ["front-chair", "front-counter", "front-bell", "done-tray"] },
  {
    id: "meeting",
    ids: layout.objects.filter((o) => o.id.startsWith("meeting-")).map((o) => o.id),
  },
  {
    id: "lounge",
    ids: ["lounge-sofa", "lounge-table", "coffee-machine", "lounge-plant", "aisle-plant-1"],
  },
  { id: "entrance", ids: ["entrance", "entrance-mat"] },
  { id: "printer", ids: ["printer"] },
  {
    id: "north-wall",
    ids: layout.objects.filter((o) => catalog.items[o.item].layer === "wall").map((o) => o.id),
  },
);
for (const group of groups) {
  const objects = layout.objects.filter((object) => group.ids.includes(object.id));
  const x = Math.max(0, Math.min(...objects.map((o) => o.x)) * 32 - 32);
  const y = Math.max(0, Math.min(...objects.map((o) => o.y)) * 32 - 96);
  const right = Math.min(
    width,
    Math.max(...objects.map((o) => o.x + catalog.items[o.item].footprint.w)) * 32 + 32,
  );
  const bottom = Math.min(
    height,
    Math.max(...objects.map((o) => o.y + catalog.items[o.item].footprint.h)) * 32 + 32,
  );
  const image = crop(panorama, { x, y, w: right - x, h: bottom - y });
  save(`${group.id}@3x`, resize(image, image.width * 3, image.height * 3));
}
await browser.close();
assert.deepEqual(errors, []);
const furniture = readPng("public/furniture.png");
const frames = readJson("public/furniture.json").frames;
const characters = people();
for (const png of Object.values(characters)) quantize(png, palette());
const comparison = new PNG({ width: 384, height: 128 });
for (let p = 0; p < comparison.data.length; p += 4) comparison.data.set([246, 233, 206, 255], p);
for (const [i, facing] of ["left", "left", "right", "right", "down", "up"].entries()) {
  const chair = catalog.items[`chair-${facing}`];
  const center = i * 64 + 32;
  const parts = chair.parts.map((part) => ({
    png: crop(furniture, frames[part.frame].frame),
    x: center - chair.seat.x + part.dx,
    y: 96 - chair.seat.y + part.dy,
    sortY: part.sortY,
  }));
  if (i % 2 || i >= 4) {
    const png = characters[`sit/${facing}`];
    parts.push({ png, x: center - png.width / 2, y: 96 - png.height, sortY: chair.seat.y });
  }
  for (const part of parts.sort((a, b) => a.sortY - b.sortY))
    paste(comparison, part.png, part.x, part.y);
}
save("side-chairs@3x", resize(comparison, 1152, 384));
console.log(
  `Office check: ${groups.length + 3} screenshots; browser errors ${errors.length}; ${output}`,
);
