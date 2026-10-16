import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { PNG } from "pngjs";
import { crop, resize } from "./image.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/data/cache/ms-playwright";
const { chromium } = createRequire("/data/tools/playwright/package.json")("playwright");
const [base, password, directory = "office-w76"] = process.argv.slice(2);
if (!base || !password)
  throw new Error("Usage: check-seat-bubbles.mjs <Vite URL> <password> [output]");
const output = resolve(directory);
mkdirSync(`${output}/idle`, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const login = await context.request.post(`${base}/api/v1/auth/login`, { data: { password } });
  assert.ok(login.ok());
  const agents = [];
  for (const [index, kind] of ["codex", "claude-code", "custom"].entries()) {
    const result = await context.request.post(`${base}/api/v1/agents`, {
      data: { kind, name: `W76 ${kind}`, host: `w76-${index}`, capabilities: [] },
    });
    assert.ok(result.ok());
    agents.push(await result.json());
  }
  const heartbeat = async () => {
    for (const { apiKey } of agents) {
      const result = await context.request.post(`${base}/api/v1/agents/me/heartbeat`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        data: {},
      });
      assert.ok(result.ok());
    }
  };
  await heartbeat();
  const storageState = await context.storageState();
  const setup = async (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/acceptance.html", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html><head><link rel="stylesheet" href="/office/src/fonts.css"></head><body></body></html>',
      }),
    );
    await page.goto(`${base}/office/acceptance.html`);
    await page.evaluate(async () => {
      const { default: RefreshRuntime } = await import("/office/@react-refresh");
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const { acceptanceStage } = await import("/office/tools/acceptance-stage.mjs");
      window.acceptance = await acceptanceStage();
    });
  };
  for (const deviceScaleFactor of [1, 2]) {
    for (const [width, height] of [
      [1440, 900],
      [1000, 700],
    ]) {
      const view = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor,
        storageState,
      });
      const page = await view.newPage();
      await setup(page);
      const boxes = await page.evaluate(
        (ids) => {
          const { cast, stage } = window.acceptance;
          for (const [index, id] of ids.entries())
            cast.characters
              .get(id)
              .bubble.show(
                index === 0
                  ? "心跳不会打断行程，完成后回座。"
                  : "Heartbeat received. Back to my seat!",
                Infinity,
              );
          return {
            bubbles: ids.slice(0, 2).map((id) => {
              const p = cast.characters.get(id);
              const head = stage.world.toGlobal({ x: p.x, y: p.y - 104 });
              return { x: Math.max(0, head.x - 115), y: Math.max(0, head.y - 85), w: 230, h: 95 };
            }),
            plaques: stage.layout.zones.slice(0, 3).map(({ plaque }) => {
              const p = stage.world.toGlobal(plaque);
              return {
                x: p.x,
                y: p.y,
                w: plaque.w * stage.world.scale.x,
                h: plaque.h * stage.world.scale.y,
              };
            }),
            resolution: stage.app.renderer.resolution,
            screen: { w: stage.app.screen.width, h: stage.app.screen.height },
          };
        },
        agents.map(({ agent }) => agent.id),
      );
      assert.equal(boxes.resolution, deviceScaleFactor);
      assert.deepEqual(boxes.screen, { w: width, h: height });
      await page.waitForTimeout(1200);
      const name = `${width}x${height}-dpr${deviceScaleFactor}`;
      const png = PNG.sync.read(await page.screenshot({ path: `${output}/${name}.png` }));
      assert.equal(png.width, width * deviceScaleFactor);
      for (const [kind, regions] of Object.entries({
        bubbles: boxes.bubbles,
        plaques: boxes.plaques,
      })) {
        for (const [index, box] of regions.entries()) {
          const physical = Object.fromEntries(
            Object.entries(box).map(([key, value]) => [key, Math.round(value * deviceScaleFactor)]),
          );
          const detail = crop(png, physical);
          writeFileSync(
            `${output}/${name}-${kind}-${index}@3x.png`,
            PNG.sync.write(resize(detail, detail.width * 3, detail.height * 3)),
          );
        }
      }
      await view.close();
    }
  }
  const page = await context.newPage();
  await page.addInitScript(() => {
    let seed = 76;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  });
  await setup(page);
  const samples = [],
    frames = [];
  const started = Date.now();
  for (let tick = 0; tick <= 240; tick++) {
    await page.waitForTimeout(Math.max(0, started + tick * 500 - Date.now()));
    const elapsed = tick * 500;
    if (elapsed % 15000 === 0) await heartbeat();
    if (elapsed % 1000 === 0)
      samples.push({ elapsed, people: await page.evaluate(() => window.acceptance.sample()) });
    if (elapsed % 10000 === 0)
      await page.screenshot({
        path: `${output}/heartbeat-${String(elapsed / 1000).padStart(3, "0")}.png`,
      });
    if (elapsed < 60000) {
      const name = `${String(tick).padStart(3, "0")}.png`;
      frames.push(`file '${name}'\nduration 0.5\n`);
      await page.screenshot({ path: `${output}/idle/${name}` });
    }
  }
  for (const { agent } of agents) {
    const states = samples.map(({ people }) => people.find(({ id }) => id === agent.id));
    assert.ok(
      states.some((person) => person.state === "walk"),
      `${agent.name}: no idle walk observed`,
    );
    assert.ok(
      states.some(
        (person, i) =>
          i > 0 && states[i - 1].state !== "sit" && person.state === "sit" && person.seated,
      ),
      `${agent.name}: no return to seat observed`,
    );
    let stopped = 0;
    for (const person of states) {
      stopped = person.state === "idle" && !person.seated ? stopped + 1000 : 0;
      assert.ok(stopped <= 8000, `${agent.name}: stranded away from seat`);
    }
  }
  writeFileSync(`${output}/samples.json`, JSON.stringify(samples, null, 2));
  writeFileSync(`${output}/idle/frames.ffconcat`, `ffconcat version 1.0\n${frames.join("")}`);
  assert.deepEqual(errors, []);
  process.stdout.write(
    `W76: four DPR/viewport combinations, 120s heartbeats, 60s idle frames; ${errors.length} browser errors; ${output}\n`,
  );
} finally {
  await browser.close();
}
