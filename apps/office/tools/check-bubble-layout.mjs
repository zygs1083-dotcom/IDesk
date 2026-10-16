import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { PNG } from "pngjs";
import { crop, resize } from "./image.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/data/cache/ms-playwright";
const { chromium } = createRequire("/data/tools/playwright/package.json")("playwright");
const [base, directory = "/tmp/office-w78"] = process.argv.slice(2);
const output = resolve(directory);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const samples = [];
for (const [width, height, deviceScaleFactor] of [
  [1000, 700, 1],
  [1000, 700, 2],
  [1440, 900, 1],
]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/bubbles.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><link rel="stylesheet" href="/office/src/fonts.css"></head><body></body></html>',
    }),
  );
  await page.goto(`${base}/office/bubbles.html`);
  await page.evaluate(async () => {
    await import("/office/@vite/client");
    const { bubbleStage } = await import("/office/tools/bubble-stage.mjs");
    window.scene = await bubbleStage();
  });
  await page.mouse.move(width - 1, height - 1);
  const prefix = `${width}x${height}-dpr${deviceScaleFactor}`;
  const suffix = "-tails";
  const scenario = async (name, points, messages) => {
    await page.evaluate(
      ({ points, messages }) => {
        window.scene.place(points);
        messages.forEach((message, index) => {
          window.scene.people[index].bubble.show(message, Infinity);
        });
      },
      { points, messages },
    );
    await page.waitForFunction(
      (count) => window.scene.sample().filter((p) => p.visible).length === count,
      messages.length,
    );
    const sample = await page.evaluate(() => window.scene.sample());
    const visible = sample.filter((p) => p.visible);
    for (const [i, item] of visible.entries()) {
      for (const bounds of [item.bounds, item.tailBounds]) {
        assert.ok(
          bounds.minX >= 0 && bounds.minY >= 0 && bounds.maxX <= width && bounds.maxY <= height,
        );
      }
      for (const other of visible.slice(i + 1)) {
        const a = item.rect,
          b = other.rect;
        assert.ok(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
        );
      }
    }
    for (const item of visible) {
      for (const other of visible.filter((other) => other !== item)) {
        for (let index = 1; index < item.tail.length; index++) {
          const a = item.tail[index - 1],
            b = item.tail[index],
            r = other.rect;
          for (let step = 0; step <= 1000; step++) {
            const x = a.x + ((b.x - a.x) * step) / 1000;
            const y = a.y + ((b.y - a.y) * step) / 1000;
            assert.ok(
              x < r.x - 1 || x > r.x + r.width + 1 || y < r.y - 1 || y > r.y + r.height + 1,
            );
          }
        }
      }
    }
    samples.push({ viewport: prefix, name, people: sample });
    const png = PNG.sync.read(
      await page.screenshot({ path: `${output}/${prefix}-${name}${suffix}.png` }),
    );
    const bounds = visible.flatMap((p) => [p.bounds, p.tailBounds]);
    const x = Math.max(0, Math.floor(Math.min(...bounds.map((b) => b.minX)) - 15));
    const y = Math.max(0, Math.floor(Math.min(...bounds.map((b) => b.minY)) - 15));
    const w = Math.min(width - x, Math.ceil(Math.max(...bounds.map((b) => b.maxX)) - x + 15));
    const h = Math.min(height - y, Math.ceil(Math.max(...bounds.map((b) => b.maxY)) - y + 80));
    const detail = crop(png, {
      x: x * deviceScaleFactor,
      y: y * deviceScaleFactor,
      w: w * deviceScaleFactor,
      h: h * deviceScaleFactor,
    });
    writeFileSync(
      `${output}/${prefix}-${name}@3x${suffix}.png`,
      PNG.sync.write(resize(detail, detail.width * 3, detail.height * 3)),
    );
  };
  const center = width / 2;
  const report = ["心跳不会打断行程，完成后回座。", "Heartbeat received. Back to my seat!"];
  await scenario(
    "reports",
    [
      { x: center - 20, y: 330 },
      { x: center + 20, y: 330 },
    ],
    report,
  );
  for (const [index, text] of ["…", "哈哈", "嗯嗯"].entries()) {
    const messages = index % 2 ? ["…", text] : [text, "…"];
    await scenario(
      `chat-${index}`,
      [
        { x: center - 20, y: 330 },
        { x: center + 20, y: 330 },
      ],
      messages,
    );
  }
  await scenario(
    "three",
    [center - 40, center, center + 40].map((x) => ({ x, y: 330 })),
    [...report, "三个同事同时汇报进展。"],
  );
  await scenario("edges", await page.evaluate(() => window.scene.edgeHeads()), [
    ...report,
    "靠近顶边仍然可读。",
  ]);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({ path: `${output}/${prefix}-edges-dark${suffix}.png` });
  if (width === 1440) {
    await page.setViewportSize({ width: 160, height: 70 });
    await page.waitForFunction(() => window.scene.stage.app.screen.width === 160);
    await page.evaluate(() => {
      window.scene.place([
        { x: 60, y: 65 },
        { x: 100, y: 65 },
      ]);
      window.scene.people[0].bubble.show("First message", 1200);
      window.scene.people[1].bubble.show("Queued message", 1000);
      window.scene.people[1].bubble.show("Next message", 500);
    });
    await page.waitForFunction(() => {
      const [first, second] = window.scene.sample();
      return first.visible && !second.visible;
    });
    await page.waitForFunction(() => {
      const [first, second] = window.scene.sample();
      return !first.visible && second.visible && second.text.endsWith("…");
    });
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => window.scene.sample()[1].visible), true);
    await page.waitForFunction(() => window.scene.sample()[1].text === "Next message");
    await page.waitForFunction(() => !window.scene.sample()[1].visible);
  }
  await context.close();
}
assert.deepEqual(errors, []);
writeFileSync(`${output}/samples-tails.json`, JSON.stringify(samples, null, 2));
await browser.close();
process.stdout.write(
  `W78: ${samples.length} scenes, no intersecting bodies or out-of-canvas bounds, ${errors.length} browser errors; ${output}\n`,
);
