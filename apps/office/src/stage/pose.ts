import type { Direction } from "../scene/scene.ts";
import type { CharacterState } from "./character.ts";

export function characterPose(
  state: CharacterState,
  facing: Direction,
  elapsed: number,
  mirrored = false,
  upright = false,
) {
  const seated = state === "sit" || state === "typing" || state === "talk";
  // 柜台挡住腿的座位用正面站立帧当坐姿：正对观众，没有斜坐帧伸出去的腿。
  if (seated && upright) return { frame: `walk/${facing}/0`, mirror: false };
  const direction = facing === "down" ? "front" : facing === "up" ? "back" : "right";
  const frame =
    state === "typing"
      ? `typing/${direction}/${Math.floor(elapsed / 300) % 2}`
      : seated
        ? `sit/${direction}`
        : `walk/${facing}/${state === "walk" ? Math.floor(elapsed / 150) % 4 : 0}`;
  return {
    frame,
    mirror: seated && (facing === "down" || facing === "up" ? mirrored : facing === "left"),
  };
}
