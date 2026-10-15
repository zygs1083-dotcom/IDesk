import { describe, expect, it } from "vitest";
import type { Direction } from "../world/places.ts";
import type { CharacterState } from "./character.ts";
import { characterPose } from "./pose.ts";

describe("character poses", () => {
  for (const facing of ["left", "right", "down", "front", "back"] satisfies Direction[]) {
    const direction = facing === "left" ? "right" : facing;
    for (const state of ["sit", "talk", "typing"] satisfies CharacterState[]) {
      it(`${state} faces ${facing}`, () => {
        expect(characterPose(state, facing, 300)).toEqual({
          frame: state === "typing" ? `typing/${direction}/1` : `sit/${direction}`,
          mirror: facing === "left",
        });
      });
    }
    it(`seat mirror applies to ${facing}`, () => {
      expect(characterPose("typing", facing, 0, true).mirror).toBe(true);
    });
  }
  for (const facing of ["up", "down", "left", "right"] as const) {
    it(`walks ${facing} without seat mirroring`, () => {
      expect(characterPose("walk", facing, 300, true)).toEqual({
        frame: `walk/${facing}/2`,
        mirror: false,
      });
    });
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
