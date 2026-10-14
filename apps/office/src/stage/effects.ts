import { Graphics } from "pixi.js";
import { tween } from "../engine/tween.ts";
import type { Point } from "../scene/scene.ts";
import type { Stage } from "./stage.ts";

export async function envelope(stage: Stage, from: Point, to: Point) {
  const letter = new Graphics()
    .rect(-12, -8, 24, 16)
    .fill(0xfff0ce)
    .stroke({ color: 0x302a2a, width: 2 })
    .moveTo(-12, -8)
    .lineTo(0, 1)
    .lineTo(12, -8)
    .stroke({ color: 0x302a2a, width: 2 });
  letter.position.copyFrom(from);
  stage.world.addChild(letter);
  const ms = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : Math.min(600, Math.hypot(from.x - to.x, from.y - to.y) * 2);
  await tween(stage.app.ticker, letter.position, to, ms);
  letter.destroy();
}

export async function confetti(stage: Stage, point: Point) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = [0xe4a340, 0xc64e45, 0x77c9d4, 0x74925c];
  await Promise.all(
    Array.from({ length: 12 }, async (_, index) => {
      const square = new Graphics().rect(-2, -2, 4, 4).fill(colors[index % colors.length]);
      square.position.set(point.x, point.y - 90);
      stage.world.addChild(square);
      const x = point.x + (index - 5.5) * 9;
      await tween(
        stage.app.ticker,
        square.position,
        { x, y: point.y - 135 - (index % 3) * 10 },
        260,
      );
      await tween(
        stage.app.ticker,
        square.position,
        { x: x + (index - 5.5) * 3, y: point.y - 30 },
        500,
      );
      square.destroy();
    }),
  );
}
