import { describe, expect, it } from "vitest";
import type { Direction } from "../scene/scene.ts";
import type { CharacterState } from "./character.ts";
import { characterPose } from "./pose.ts";

describe("character poses", () => {
  for (const facing of ["left", "right", "down", "up"] satisfies Direction[]) {
    const direction = facing === "down" ? "front" : facing === "up" ? "back" : "right";
    for (const state of ["sit", "talk", "typing"] satisfies CharacterState[]) {
      for (const mirrored of [false, true])
        it(`${state} faces ${facing}, mirrored ${mirrored}`, () => {
          expect(characterPose(state, facing, 300, mirrored)).toEqual({
            frame: state === "typing" ? `typing/${direction}/1` : `sit/${direction}`,
            mirror: facing === "down" || facing === "up" ? mirrored : facing === "left",
          });
        });
    }
    for (const state of ["idle", "walk", "coffee", "away"] satisfies CharacterState[]) {
      it(`${state} retains ${facing} walking frames`, () => {
        expect(characterPose(state, facing, 300, true)).toEqual({
          frame: `walk/${facing}/${state === "walk" ? 2 : 0}`,
          mirror: false,
        });
      });
    }
  }
  it("cycles typing frames", () => {
    expect([0, 300, 600].map((ms) => characterPose("typing", "down", ms).frame)).toEqual([
      "typing/front/0",
      "typing/front/1",
      "typing/front/0",
    ]);
  });
});

it("upright seats use seated frames without mirroring", () => {
  for (const mirrored of [false, true]) {
    expect(characterPose("sit", "down", 0, mirrored, true)).toEqual({
      frame: "sit/upright",
      mirror: false,
    });
    for (const elapsed of [0, 300, 600])
      expect(characterPose("typing", "down", elapsed, mirrored, true)).toEqual({
        frame: `typing/upright/${Math.floor(elapsed / 300) % 2}`,
        mirror: false,
      });
  }
  expect(characterPose("walk", "down", 0, false, true).frame).toBe("walk/down/0");
});
