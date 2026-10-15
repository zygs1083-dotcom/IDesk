import type { Direction } from "../world/places.ts";
import type { CharacterState } from "./character.ts";

export function characterPose(
  state: CharacterState,
  facing: Direction,
  elapsed: number,
  mirror = false,
) {
  const seated = state === "sit" || state === "typing" || state === "talk";
  const direction = facing === "left" ? "right" : facing;
  const walking = facing === "front" ? "down" : facing === "back" ? "up" : facing;
  const frame =
    state === "typing"
      ? `typing/${direction}/${Math.floor(elapsed / 300) % 2}`
      : seated
        ? `sit/${direction}`
        : `walk/${walking}/${state === "walk" ? Math.floor(elapsed / 150) % 4 : 0}`;
  return { frame, mirror: seated && (mirror || facing === "left") };
}
