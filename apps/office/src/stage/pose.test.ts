import { describe, expect, it } from "vitest";
import type { Direction } from "../world/seats.ts";
import type { CharacterState } from "./character.ts";
import { characterPose } from "./pose.ts";

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

it("receptionist uses the same front-facing seat pose", () => {
  expect(characterPose("sit", "down", 0)).toEqual({ frame: "sit/down", mirror: false });
});
