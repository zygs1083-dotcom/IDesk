import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { Container, Texture } from "pixi.js";
import { expect, test, vi } from "vitest";
import { Cast } from "../src/director/cast.ts";
import { Character } from "../src/stage/character.ts";
import { bodiesIntersect } from "../src/world/stops.ts";
import { readJson, readPng, root } from "./image.mjs";
import { walkingBounds } from "./walking-silhouette.mjs";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));
vi.mock("../src/stage/glyphs.ts", () => ({ setGlyphText: async () => {} }));

const layout = parseOfficeLayout(readJson(`${root}public/layout.json`));
const atlas = readJson(`${root}public/characters.json`);
const { clearance, ...body } = walkingBounds(atlas, readPng(`${root}public/characters.png`));

function corridor(axis = "horizontal") {
  const updates = new Set();
  const ticker = { deltaMS: 16, add: (fn) => updates.add(fn), remove: (fn) => updates.delete(fn) };
  const stage = {
    app: { ticker },
    screen: new Container(),
    world: new Container(),
    layout: {
      ...layout,
      seats: [],
      grid: {
        ...layout.grid,
        rows: layout.grid.rows.map((row, y) =>
          [...row]
            .map((_, x) =>
              (
                axis === "horizontal"
                  ? y === 50 && x >= 20 && x <= 70
                  : x === 75 && y >= 8 && y <= 53
              )
                ? "."
                : "#",
            )
            .join(""),
        ),
      },
    },
  };
  const frames = Object.fromEntries(
    Object.keys(atlas.frames).map((key) => [
      key,
      new Texture({ source: Texture.EMPTY.source, defaultAnchor: atlas.frames[key].anchor }),
    ]),
  );
  const a = new Character(stage, { id: "a", kind: "claude-code", name: "a" }, frames);
  const b = new Character(stage, { id: "b", kind: "codex", name: "b" }, frames);
  a.position.set(328, 808);
  b.position.set(968, 808);
  if (axis === "vertical") {
    a.position.set(1208, 136);
    b.position.set(1208, 776);
  }
  const cast = Object.create(Cast.prototype);
  Object.assign(cast, {
    stage,
    characters: new Map([
      ["a", a],
      ["b", b],
    ]),
    stopping: new Map(),
  });
  const step = async () => {
    for (const fn of [...updates]) fn(ticker);
    await Promise.resolve();
    await Promise.resolve();
    if (a.state !== "walk" && b.state !== "walk") expect(bodiesIntersect(a, b, body)).toBe(false);
  };
  return { cast, a, b, step };
}

test("runtime bounds come from every real anchored walking frame, including its full height", () => {
  expect(layout.grid.silhouette).toEqual(body);
  expect(layout.grid.clearance).toBe(clearance);
  expect(body.bottom - body.top).toBeGreaterThan(clearance * 2);
});

test.each([
  ["horizontal", "opposite"],
  ["horizontal", "same"],
  ["vertical", "opposite"],
  ["vertical", "same"],
])(
  "%s %s-direction walkers stop without overlapping in a one-cell aisle",
  async (axis, direction) => {
    const { cast, a, b, step } = corridor(axis);
    const firstStart = { x: a.x, y: a.y };
    if (direction === "same")
      b.position.set(axis === "horizontal" ? 488 : 1208, axis === "horizontal" ? 808 : 296);
    const target = axis === "horizontal" ? { x: 1032, y: 808 } : { x: 1208, y: 840 };
    const first = cast.walk("a", { ...target, facing: "right" });
    const second = cast.walk("b", {
      ...(direction === "same" ? target : firstStart),
      facing: "left",
    });
    for (let i = 0; i < 800; i++) await step();
    await Promise.all([first, second]);
    expect(a.state).toBe("idle");
    expect(b.state).toBe("idle");
    expect(bodiesIntersect(a, b, body)).toBe(false);
    expect({ x: a.x, y: a.y }).not.toEqual(firstStart);
  },
);

test("an interruption inside another stopped body continues to a clear parking point", async () => {
  const { cast, a, b, step } = corridor();
  b.position.set(600, 808);
  const action = cast.walk("a", { x: 1032, y: 808, facing: "right" });
  for (let i = 0; i < 400 && !bodiesIntersect(a, b, body); i++) await step();
  expect(bodiesIntersect(a, b, body)).toBe(true);
  a.stopWalking();
  for (let i = 0; i < 400; i++) await step();
  await action;
  expect(a.state).toBe("idle");
  expect(bodiesIntersect(a, b, body)).toBe(false);
  expect(a.x).toBeLessThan(1032);
});
