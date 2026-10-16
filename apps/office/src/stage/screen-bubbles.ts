import { Container } from "pixi.js";
import { Bubble } from "./bubble.ts";
import { type BubblePlacement, layoutBubbles } from "./bubble-layout.ts";

export function screenBubbles(screen: Container, canvas: { width: number; height: number }) {
  const tails = screen.addChildAt(new Container({ eventMode: "none" }), 0);
  let previous: BubblePlacement[] = [];
  return (elapsed: number) => {
    const bubbles = screen.children.filter((child): child is Bubble => child instanceof Bubble);
    for (const bubble of bubbles) {
      if (!bubble.tail.parent) tails.addChild(bubble.tail);
      bubble.advance(elapsed);
    }
    const inputs = bubbles.flatMap((bubble) => {
      const input = bubble.input();
      return input ? [input] : [];
    });
    previous = layoutBubbles(inputs, canvas, previous);
    const placements = new Map(previous.map((placement) => [placement.id, placement]));
    for (const bubble of bubbles) {
      const input = bubble.input();
      const placement = input && placements.get(input.id);
      if (placement) bubble.draw(placement);
    }
  };
}
