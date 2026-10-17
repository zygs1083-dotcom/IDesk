import { useDraggable } from "@dnd-kit/core";
import type { ComponentProps } from "react";
import { useSession } from "../../lib/use-session.ts";
import { TaskCard } from "./task-card.tsx";

export function DraggableCard(props: Omit<ComponentProps<typeof TaskCard>, "drag" | "overlay">) {
  const { isAdmin } = useSession();
  const drag = useDraggable({ id: props.task.id, disabled: !isAdmin });
  return isAdmin ? <TaskCard {...props} drag={drag} /> : <TaskCard {...props} />;
}
