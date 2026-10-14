import { useCallback, useEffect, useRef, useState } from "react";
import { direct } from "./director/director.ts";
import { type Scene, sceneSchema } from "./scene/scene.ts";
import { assignSeats } from "./scene/seats.ts";
import { createEditor } from "./stage/editor.ts";
import { createStage } from "./stage/stage.ts";
import { AgentPanel } from "./ui/agent-panel.tsx";
import { PixelButton } from "./ui/pixel-button.tsx";
import { Roster } from "./ui/roster.tsx";
import { RosterItem } from "./ui/roster-item.tsx";
import { TaskPanel } from "./ui/task-panel.tsx";
import { TopBar } from "./ui/top-bar.tsx";
import { useOfficeData } from "./ui/use-office-data.ts";

export function App() {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<ReturnType<typeof createEditor>>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const { agents, tasks, error: dataError } = useOfficeData();
  const [scene, setScene] = useState<Scene>();
  const [selection, setSelection] = useState<{ type: "agent" | "task"; id: string }>();
  const closePanel = useCallback(() => setSelection(undefined), []);
  const selectAgent = (id: string) => setSelection({ type: "agent", id });
  useEffect(() => {
    const select = (event: Event) =>
      setSelection((event as CustomEvent<{ type: "agent" | "task"; id: string }>).detail);
    window.addEventListener("office:select", select);
    return () => window.removeEventListener("office:select", select);
  }, []);
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver;
    let stage: Awaited<ReturnType<typeof createStage>>;
    const start = async () => {
      const response = await fetch("/office/scene.json");
      if (!response.ok) throw new Error("场景加载失败");
      const scene = sceneSchema.parse(await response.json());
      const element = host.current;
      if (!element || disposed) return;
      setScene(scene);
      stage = await createStage(element);
      if (disposed) {
        stage.app.destroy(true, { children: true });
        return;
      }
      stage.app.resizeTo = element;
      observer = new ResizeObserver(() => stage.app.resize());
      observer.observe(element);
      editor.current = createEditor(stage, scene, setEditing);
      await direct(stage, scene);
    };
    void start().catch((reason: Error) => {
      if (!disposed) setError(reason.message);
    });
    return () => {
      disposed = true;
      observer?.disconnect();
      editor.current?.destroy();
      editor.current = null;
      stage?.app.destroy(true, { children: true });
    };
  }, []);
  const seats = scene ? assignSeats(agents, scene) : new Map();
  const agent =
    selection?.type === "agent" ? agents.find((item) => item.id === selection.id) : undefined;
  const task =
    selection?.type === "task" ? tasks.find((item) => item.id === selection.id) : undefined;
  return (
    <main className="office-frame" aria-label="像素办公室">
      <TopBar title={scene?.title ?? "IDesk 调度中心"} agents={agents} tasks={tasks} />
      <section className="pixel-panel avatar-strip" aria-label="今日值班">
        <h2>今日值班</h2>
        {agents.map((item) => (
          <RosterItem key={item.id} agent={item} tasks={tasks} onSelect={selectAgent} />
        ))}
      </section>
      <div className={`office-body${agent || task ? " has-detail" : ""}`}>
        {scene && (
          <Roster
            zones={scene.zones.slice(0, 2)}
            agents={agents}
            tasks={tasks}
            seats={seats}
            onSelect={selectAgent}
          />
        )}
        <div className="stage-host" ref={host} />
        {agent ? (
          <AgentPanel key={agent.id} agent={agent} tasks={tasks} onClose={closePanel} />
        ) : task ? (
          <TaskPanel task={task} agents={agents} onClose={closePanel} />
        ) : scene ? (
          <Roster
            zones={scene.zones.slice(2)}
            agents={agents}
            tasks={tasks}
            seats={seats}
            onSelect={selectAgent}
          />
        ) : null}
      </div>
      {(error || dataError) && (
        <p className="office-error" role="alert">
          {error || dataError}
        </p>
      )}
      {editing && (
        <div className="editor-export">
          <PixelButton onClick={() => void editor.current?.exportJson()}>导出 JSON</PixelButton>
        </div>
      )}
    </main>
  );
}
