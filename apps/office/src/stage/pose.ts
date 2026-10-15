import type { Direction } from "../scene/scene.ts";
import type { CharacterState } from "./character.ts";

export function characterPose(state: CharacterState, facing: Direction, elapsed: number) {
  const seated = state === "sit" || state === "typing" || state === "talk";
  const direction = facing === "left" ? "right" : facing;
  const frame =
    state === "typing"
      ? `typing/${direction}/${Math.floor(elapsed / 300) % 2}`
      : seated
        ? `sit/${direction}`
        : `walk/${facing}/${state === "walk" ? Math.floor(elapsed / 150) % 4 : 0}`;
  return { frame, mirror: seated && facing === "left" };
}
