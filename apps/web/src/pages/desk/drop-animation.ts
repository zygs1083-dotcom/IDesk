import type { DropAnimationFunction } from "@dnd-kit/core";
import { animate } from "motion/react";

export const dropAnimation: DropAnimationFunction = async ({ active, dragOverlay, transform }) => {
  active.node.classList.add("opacity-0");
  await animate(
    dragOverlay.node,
    {
      x: [transform.x, transform.x + active.rect.left - dragOverlay.rect.left],
      y: [transform.y, transform.y + active.rect.top - dragOverlay.rect.top],
    },
    { type: "spring", stiffness: 500, damping: 35 },
  );
  active.node.classList.remove("opacity-0");
};
