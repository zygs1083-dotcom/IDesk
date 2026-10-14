import { PixelButton } from "./pixel-button.tsx";
import type { Agent, Task } from "./use-office-data.ts";

export function TopBar({
  title,
  agents,
  tasks,
}: {
  title: string;
  agents: Agent[];
  tasks: Task[];
}) {
  return (
    <header className="pixel-panel top-bar">
      <div>
        <h1>{title}</h1>
        <p>
          {agents.filter((agent) => agent.status === "online").length} 人在线 ·{" "}
          {tasks.filter((task) => task.status === "in_progress").length} 个任务进行中
        </p>
      </div>
      <PixelButton href="/desk">回到看板</PixelButton>
    </header>
  );
}
