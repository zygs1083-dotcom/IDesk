import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const atlas = JSON.parse(readFileSync(new URL("../public/characters.json", import.meta.url)));
const kinds = ["claude-code", "codex", "n8n", "script", "custom", "receptionist"];
const directions = ["down", "left", "right", "up"];

describe("v1 character atlas", () => {
  for (const kind of kinds) {
    it(`${kind} has exactly its walking, side and seated frames`, () => {
      const seated = kind === "receptionist" ? ["right", "down"] : ["right", "front", "back"];
      const expected = [
        ...directions.flatMap((direction) =>
          [0, 1, 2, 3].map((index) => `${kind}/walk/${direction}/${index}`),
        ),
        ...seated.flatMap((direction) => [
          `${kind}/sit/${direction}`,
          `${kind}/typing/${direction}/0`,
          `${kind}/typing/${direction}/1`,
        ]),
      ];
      expect(
        Object.keys(atlas.frames)
          .filter((name) => name.startsWith(`${kind}/`))
          .sort(),
      ).toEqual(expected.sort());
      const animations = Object.fromEntries([
        ...directions.map((direction) => [
          `${kind}/walk/${direction}`,
          [0, 1, 2, 3].map((index) => `${kind}/walk/${direction}/${index}`),
        ]),
        ...seated.map((direction) => [
          `${kind}/typing/${direction}`,
          [0, 1].map((index) => `${kind}/typing/${direction}/${index}`),
        ]),
      ]);
      expect(
        Object.fromEntries(
          Object.entries(atlas.animations).filter(([name]) => name.startsWith(`${kind}/`)),
        ),
      ).toEqual(animations);
    });
  }

  it("anchors back-facing seated frames at cushion height and all others at ground level", () => {
    const backFrames = kinds
      .filter((kind) => kind !== "receptionist")
      .flatMap((kind) => [`${kind}/sit/back`, `${kind}/typing/back/0`, `${kind}/typing/back/1`]);
    for (const [name, frame] of Object.entries(atlas.frames)) {
      expect(frame.anchor, name).toEqual({
        x: 0.5,
        y: backFrames.includes(name) ? 116 / 96 : 1,
      });
    }
  });

  it("draws back-facing seated bottoms 20px above the unchanged seat position", () => {
    const seatY = 400;
    for (const [name, frame] of Object.entries(atlas.frames)) {
      if (!name.includes("/back")) continue;
      const bottomY = seatY + (1 - frame.anchor.y) * frame.sourceSize.h;
      expect(bottomY, name).toBeCloseTo(seatY - 20);
    }
  });

  it("has no extra kinds or dangling animation frames", () => {
    expect(
      [...new Set(Object.keys(atlas.frames).map((name) => name.split("/")[0]))].sort(),
    ).toEqual([...kinds].sort());
    expect(
      [...new Set(Object.keys(atlas.animations).map((name) => name.split("/")[0]))].sort(),
    ).toEqual([...kinds].sort());
    for (const name of Object.values(atlas.animations).flat())
      expect(atlas.frames).toHaveProperty(name);
  });
});
