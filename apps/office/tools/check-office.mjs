import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { PNG } from "pngjs";
import { crop, resize } from "./image.mjs";
import { overlay } from "./occluder-overlay.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/data/cache/ms-playwright";
const { chromium } = createRequire("/data/tools/playwright/package.json")("playwright");
const url = new URL(process.argv[2]);
url.searchParams.set("check", "1");
const output = resolve(process.argv[3] ?? "office-check");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [name, hour] of [
    ["day", 12],
    ["dusk", 19],
    ["night", 22],
  ]) {
    url.searchParams.set("hour", String(hour));
    await page.goto(url.href);
    await page.locator('canvas[data-ready="true"]').waitFor();
    await page.screenshot({ path: `${output}/panorama-${name}.png` });
    if (name !== "day") continue;
    const layout = await page.evaluate(async () => (await fetch("/office/layout.json")).json());
    const panorama = PNG.sync.read(await page.screenshot());
    const groups = [
      ...layout.zones.map((zone) => ({ id: zone.id, seats: zone.seats })),
      { id: "reception", seats: [layout.reception.seat] },
      { id: "meeting", seats: layout.meeting.seats },
      { id: "lounge", seats: layout.lounge },
      { id: "entrance", points: [layout.points.door], padding: 220 },
      {
        id: "board",
        points: [
          layout.board,
          { x: layout.board.x + layout.board.w, y: layout.board.y + layout.board.h },
        ],
      },
    ];
    for (const group of groups) {
      const points = group.points ?? [
        ...layout.seats.filter((seat) => group.seats.includes(seat.id)),
        ...layout.occluders
          .filter((item) => item.id.startsWith(`${group.id}-`))
          .flatMap((item) => item.polygon.map(([x, y]) => ({ x, y }))),
      ];
      const padding = group.padding ?? 80;
      const x = Math.max(0, Math.min(...points.map((point) => point.x)) - padding);
      const y = Math.max(0, Math.min(...points.map((point) => point.y)) - Math.max(110, padding));
      const right = Math.min(layout.size.w, Math.max(...points.map((point) => point.x)) + padding);
      const bottom = Math.min(layout.size.h, Math.max(...points.map((point) => point.y)) + 50);
      const png = crop(panorama, { x, y, w: right - x, h: bottom - y });
      writeFileSync(
        `${output}/${group.id}@3x.png`,
        PNG.sync.write(resize(png, png.width * 3, png.height * 3)),
      );
    }
  }
} finally {
  await browser.close();
}
assert.deepEqual(errors, []);
overlay(resolve(output, "occluders"));
process.stdout.write(
  `Office check: day, dusk, night, nine regions and silhouette overlay; browser errors ${errors.length}; ${output}\n`,
);
