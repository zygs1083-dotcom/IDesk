import { Container, Rectangle, type Sprite, Texture } from "pixi.js";
import { expect, test, vi } from "vitest";
import atlas from "../../public/characters/codex-a.json";
import { zIndexOf } from "../world/sort.ts";
import type { Stage } from "../world/stage.ts";
import { Character } from "./character.ts";
import type { OfficeAgent } from "./textures.ts";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));
vi.stubGlobal("window", { devicePixelRatio: 2 });
vi.mock("./glyphs.ts", () => ({ setGlyphText: vi.fn() }));

test("each frame copies its atlas anchor and moving people update their depth every tick", () => {
  const frames = Object.fromEntries(
    Object.entries(atlas.frames).map(([id, data]) => [
      id,
      new Texture({
        frame: new Rectangle(0, 0, data.frame.w, data.frame.h),
        defaultAnchor: data.anchor,
      }),
    ]),
  );
  let tick = () => {};
  const stage = {
    layout: { seats: [] },
    screen: new Container(),
    world: new Container(),
    app: {
      ticker: {
        deltaMS: 300,
        add: (fn: () => void) => {
          tick = fn;
        },
        remove: vi.fn(),
      },
    },
  } as unknown as Stage;
  const character = new Character(
    stage,
    { id: "a", name: "a", kind: "codex" } as OfficeAgent,
    frames,
  );
  const sprite = character.children[0] as Sprite;
  character.position.set(562, 392);
  for (const facing of ["front", "back", "right"] as const) {
    character.facing = facing;
    for (const state of ["sit", "typing"] as const) {
      character.setState(state);
      tick();
      expect(sprite.anchor.x).toBe(sprite.texture.defaultAnchor?.x);
      expect(sprite.anchor.y).toBe(sprite.texture.defaultAnchor?.y);
      if (facing === "back")
        expect(character.y + sprite.height * (1 - sprite.anchor.y)).toBe(
          character.y + sprite.height * (1 - atlas.frames["codex-a/sit/back"].anchor.y),
        );
    }
  }
  character.mirror = true;
  tick();
  expect(sprite.anchor.x).toBe(0.5);
  expect(sprite.scale.x).toBe(-1);
  character.y = 500;
  tick();
  expect(character.zIndex).toBe(zIndexOf(500, 1));
  character.destroy({ children: true });
});
