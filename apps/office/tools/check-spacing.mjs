import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { PNG } from "pngjs";
import { enlargeCrop } from "./occluder-image.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/data/cache/ms-playwright";
const { chromium } = createRequire("/data/tools/playwright/package.json")("playwright");
const fix = process.argv.includes("--fix");
const origin = process.argv[2];
const output = resolve(process.argv[3]);
mkdirSync(`${output}/idle`, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/spacing.html", (route) =>
  route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body></body></html>" }),
);
async function setup(count = 24) {
  await page.goto(`${origin}/office/spacing.html`);
  await page.evaluate(async (count) => {
    await import("/office/@vite/client");
    const { spacingStage } = await import("/office/tools/spacing-stage.mjs");
    window.spacing = await spacingStage(count);
  }, count);
}
async function shot(name, box) {
  const png = PNG.sync.read(await page.screenshot({ path: `${output}/${name}.png` }));
  if (box) writeFileSync(`${output}/${name}@3x.png`, PNG.sync.write(enlargeCrop(png, box)));
}
await setup();
if (!fix) await shot("standing-full", { x: 360, y: 160, w: 1050, h: 660 });
await page.evaluate(() => window.spacing.chat());
await page.waitForFunction(() => {
  const { cast, chatTargets } = window.spacing;
  return chatTargets.every(
    (point, i) =>
      Math.hypot(
        cast.characters.get(`agent-${i}`).x - point.x,
        cast.characters.get(`agent-${i}`).y - point.y,
      ) < 0.5,
  );
});
const chat = await page.evaluate(() => window.spacing.chatTargets);
assert.equal(chat[0].y, chat[1].y);
const clearance = await page.evaluate(() => window.spacing.stage.layout.grid.clearance);
assert.ok(chat[1].x - chat[0].x >= clearance * 2);
await shot("chat", {
  x: Math.max(0, chat[0].x - 100),
  y: Math.max(0, chat[0].y - 130),
  w: 280,
  h: 180,
});
for (const spot of fix ? [] : ["printer", "coffee"]) {
  await setup();
  await page.evaluate((spot) => window.spacing.visit(spot), spot);
  await page.waitForFunction((spot) => {
    const { cast, stage } = window.spacing;
    const p = stage.layout.spots.find((p) => p.id === spot),
      a = cast.characters.get("agent-0");
    return Math.hypot(a.x - p.x, a.y - p.y) < 0.5 && a.state === "idle";
  }, spot);
  await page.evaluate(() => window.spacing.second());
  await page.waitForFunction(() => {
    const b = window.spacing.cast.characters.get("agent-1");
    return b.state === "walk";
  });
  await shot(
    `${spot}-second-reroutes`,
    spot === "printer" ? { x: 820, y: 40, w: 400, h: 220 } : { x: 1240, y: 420, w: 430, h: 250 },
  );
  await page.waitForFunction(() => window.spacing.cast.characters.get("agent-1").state === "idle");
  const positions = await page.evaluate(() =>
    ["agent-0", "agent-1"].map((id) => {
      const p = window.spacing.cast.characters.get(id);
      return { x: p.x, y: p.y };
    }),
  );
  assert.ok(
    Math.hypot(positions[0].x - positions[1].x, positions[0].y - positions[1].y) >= clearance * 2,
  );
  await shot(
    `${spot}-separate-stops`,
    spot === "printer" ? { x: 820, y: 40, w: 400, h: 220 } : { x: 1240, y: 420, w: 430, h: 250 },
  );
}
const samples = [];
for (const route of fix ? ["counter"] : ["desk", "counter"]) {
  await setup(16);
  await page.evaluate((route) => window.spacing.walkRoute(route), route);
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.spacing.step(200));
    samples.push(
      await page.evaluate(() =>
        ["human", "agent-0"].map((id) => {
          const p = window.spacing.cast.characters.get(id);
          return { x: p.x, y: p.y, state: p.state };
        }),
      ),
    );
    await shot(
      `${route}-${String(i).padStart(2, "0")}`,
      route === "desk" ? { x: 380, y: 190, w: 450, h: 270 } : { x: 0, y: 360, w: 470, h: 500 },
    );
  }
}
assert.ok(new Set(samples.map((pair) => JSON.stringify(pair))).size > 5);
writeFileSync(`${output}/walking-samples.json`, JSON.stringify(samples, null, 2));
await setup();
await page.evaluate(() => window.spacing.idle());
const started = Date.now();
const frames = [];
while (Date.now() - started < 60_000) {
  const name = `${String(frames.length).padStart(3, "0")}.jpg`;
  frames.push({ name, at: Date.now() - started });
  await page.screenshot({ path: `${output}/idle/${name}`, type: "jpeg", quality: 85 });
  await page.waitForTimeout(Math.max(0, started + frames.length * 500 - Date.now()));
}
writeFileSync(
  `${output}/idle/frames.ffconcat`,
  "ffconcat version 1.0\n" +
    frames
      .map(
        (frame, index) =>
          `file '${frame.name}'\nduration ${((frames[index + 1]?.at ?? 60_000) - frame.at) / 1000}\n`,
      )
      .join(""),
);
await browser.close();
assert.deepEqual(errors, []);
process.stdout.write(
  `Spacing check: chat, printer/coffee occupancy, standing, two walking routes, 60s idle; ${errors.length} browser errors; ${output}\n`,
);
