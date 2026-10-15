import { describe, expect, it } from "vitest";
import type { Direction } from "../scene/scene.ts";
import type { CharacterState } from "./character.ts";
import { characterPose } from "./pose.ts";
import { signScale } from "./zone-sign.ts";

describe("character poses", () => {
  for (const facing of ["left", "right", "down", "up"] satisfies Direction[]) {
    const direction = facing === "left" ? "right" : facing;
    for (const state of ["sit", "talk", "typing"] satisfies CharacterState[]) {
      it(`${state} faces ${facing}`, () => {
        expect(characterPose(state, facing, 300)).toEqual({
          frame: state === "typing" ? `typing/${direction}/1` : `sit/${direction}`,
          mirror: facing === "left",
        });
      });
    }
    for (const state of ["idle", "walk", "coffee", "away"] satisfies CharacterState[]) {
      it(`${state} retains ${facing} walking frames`, () => {
        expect(characterPose(state, facing, 300)).toEqual({
          frame: `walk/${facing}/${state === "walk" ? 2 : 0}`,
          mirror: false,
        });
      });
    }
  }
  it("cycles typing frames", () => {
    expect([0, 300, 600].map((ms) => characterPose("typing", "down", ms).frame)).toEqual([
      "typing/down/0",
      "typing/down/1",
      "typing/down/0",
    ]);
  });
});

describe("zone sign scale", () => {
  it.each([0.25, 0.5, 0.85, 1, 1.5, 2])("keeps text readable at %s", (scale) => {
    expect(signScale(scale)).toBe(Math.max(1, 1 / scale));
    expect(12 * scale * signScale(scale)).toBeGreaterThanOrEqual(12);
  });
});
