import { useSyncExternalStore } from "react";
import { soundState, toggleSound } from "../engine/sound.ts";
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
  const sound = useSyncExternalStore(soundState.subscribe, soundState.getSnapshot);
  return (
    <header className="pixel-panel top-bar">
      <div>
        <h1>{title}</h1>
        <p>
          {agents.filter((agent) => agent.status === "online").length} 人在线 ·{" "}
          {tasks.filter((task) => task.status === "in_progress").length} 个任务进行中
        </p>
      </div>
      <div className="top-bar-actions">
        <PixelButton aria-label="声音" aria-pressed={sound} onClick={toggleSound}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            shapeRendering="crispEdges"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="1" y="6" width="3" height="4" />
            <rect x="4" y="4" width="2" height="8" />
            <rect x="6" y="2" width="2" height="12" />
            {sound ? (
              <>
                <rect x="10" y="5" width="1" height="6" />
                <rect x="12" y="3" width="1" height="2" />
                <rect x="13" y="5" width="1" height="6" />
                <rect x="12" y="11" width="1" height="2" />
              </>
            ) : (
              <>
                <rect x="10" y="5" width="2" height="2" />
                <rect x="12" y="7" width="2" height="2" />
                <rect x="14" y="9" width="2" height="2" />
                <rect x="14" y="5" width="2" height="2" />
                <rect x="10" y="9" width="2" height="2" />
              </>
            )}
          </svg>
        </PixelButton>
        <PixelButton href="/desk">回到看板</PixelButton>
      </div>
    </header>
  );
}
