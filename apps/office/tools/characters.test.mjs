import { readFileSync } from "node:fs";
import { describe, expect, it, test } from "vitest";
import { atlas, outfitIds, sprites } from "./character-atlases.mjs";
import { shoulderY } from "./character-shoulder.mjs";

const kinds = outfitIds;
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

  it("draws seated bottoms at the measured lift above their world seat coordinates", () => {
    const layout = JSON.parse(readFileSync(new URL("../public/layout.json", import.meta.url)));
    for (const seat of layout.seats) {
      const kind = seat.id === layout.reception.seat ? "receptionist" : "codex-a";
      const facing = seat.facing === "left" ? "right" : seat.facing;
      const lift =
        facing === "back"
          ? shoulderY(sprites, atlas.frames[`${kind}/sit/back`].frame) - 24
          : facing === "down"
            ? -7
            : 0;
      for (const pose of [`sit/${facing}`, `typing/${facing}/0`, `typing/${facing}/1`]) {
        const frame = atlas.frames[`${kind}/${pose}`];
        const bottomY = seat.y + (1 - frame.anchor.y) * frame.sourceSize.h;
        expect(bottomY, `${seat.id} ${pose}`).toBeCloseTo(seat.y - lift);
      }
    }
    for (const [name, frame] of Object.entries(atlas.frames)) {
      if (name.includes("/back")) continue;
      const lift = /^receptionist\/(sit\/down|typing\/down\/[01])$/.test(name) ? -7 : 0;
      expect(frame.anchor, name).toEqual({ x: 0.5, y: (96 + lift) / 96 });
    }
  });

  it("shows every outfit's back shoulders 4–6px above the zone 1 chair", () => {
    for (const kind of kinds.filter((id) => id !== "receptionist")) {
      const sitting = atlas.frames[`${kind}/sit/back`];
      const shoulder = shoulderY(sprites, sitting.frame);
      if (kind === "codex-a") expect(shoulder).toBe(57);
      const lift = sitting.sourceSize.h * (sitting.anchor.y - 1);
      const exposed = 325 - (392 - sitting.sourceSize.h - lift + shoulder);
      expect(exposed, kind).toBeGreaterThanOrEqual(4);
      expect(exposed, kind).toBeLessThanOrEqual(6);
      for (const pose of [`typing/back/0`, `typing/back/1`])
        expect(atlas.frames[`${kind}/${pose}`].anchor, `${kind}/${pose}`).toEqual(sitting.anchor);
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

test("each outfit PNG fits the transfer budget", () => {
  for (const id of outfitIds) {
    expect(
      readFileSync(new URL(`../public/characters/${id}.png`, import.meta.url)).length,
    ).toBeLessThanOrEqual(250 * 1024);
  }
});
