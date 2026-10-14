import { useDraggable } from "@dnd-kit/core";
import type { ComponentProps } from "react";
import { TaskCard } from "./task-card.tsx";

export function DraggableCard(props: Omit<ComponentProps<typeof TaskCard>, "drag" | "overlay">) {
  const drag = useDraggable({ id: props.task.id });
  return <TaskCard {...props} drag={drag} />;
}
