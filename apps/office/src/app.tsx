import { useCallback, useEffect, useRef, useState } from "react";
import { direct } from "./director/director.ts";
import { type ReplayControls, replay } from "./director/replay.ts";
import { setTimeScale } from "./engine/tween.ts";
import { useLang } from "./i18n/lang.tsx";
import { type Scene, sceneSchema } from "./scene/scene.ts";
import { assignSeats, assignStanding } from "./scene/seats.ts";
import { createEditor } from "./stage/editor.ts";
import { createStage } from "./stage/stage.ts";
import { PixelButton } from "./ui/pixel-button.tsx";
import { ProfileModal } from "./ui/profile-modal.tsx";
import { ReplayBar } from "./ui/replay-bar.tsx";
import { Roster } from "./ui/roster.tsx";
import { RosterItem } from "./ui/roster-item.tsx";
import { TaskPanel } from "./ui/task-panel.tsx";
import { TopBar } from "./ui/top-bar.tsx";
import { useOfficeData } from "./ui/use-office-data.ts";

export function App() {
  const { t } = useLang();
  const stageText = useRef(t);
  stageText.current = t;
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<ReturnType<typeof createEditor>>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<{ mode: "live" } | { mode: "replay"; at: number }>({
    mode: "live",
  });
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const controls = useRef<ReplayControls>({
    start: 0,
    end: 0,
    playing,
    speed,
    update: (at, ended) => {
      setAt(at);
      if (ended) setPlaying(false);
    },
  });
  controls.current.playing = playing;
  controls.current.speed = speed;
  const { agents, tasks, admin, error: dataError } = useOfficeData(mode.mode === "live");
  const enterReplay = () => {
    const end = Date.now();
    controls.current.end = end;
    controls.current.start = end - 3600000;
    setAt(controls.current.start);
    setPlaying(true);
    setMode({ mode: "replay", at: controls.current.start });
  };
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
      if (!response.ok) throw new Error(stageText.current("office.loadFailed"));
      const scene = sceneSchema.parse(await response.json());
      const element = host.current;
      if (!element || disposed) return;
      setScene(scene);
      await document.fonts.load('12px "Fusion Pixel"');
      if (disposed) return;
      stage = await createStage(element);
      if (disposed) {
        stage.world.destroy({ children: true });
        stage.app.destroy(true, { children: true });
        return;
      }
      stage.app.resizeTo = element;
      observer = new ResizeObserver(() => stage.app.resize());
      observer.observe(element);
      setTimeScale(1);
      const daylight = await (mode.mode === "live"
        ? direct(stage, scene, stageText.current("common.human"), [
            stageText.current("idle.anyTasks"),
            stageText.current("idle.cheer"),
            stageText.current("idle.coffee"),
            stageText.current("idle.slacking"),
            stageText.current("idle.waiting"),
          ])
        : replay(stage, scene, mode.at, controls.current, stageText.current("common.human")));
      if (disposed) return;
      editor.current = createEditor(stage, scene, (active) => {
        setEditing(active);
        daylight?.setEditing(active);
      });
    };
    void start().catch((reason: Error) => {
      if (!disposed) setError(reason.message);
    });
    return () => {
      disposed = true;
      observer?.disconnect();
      editor.current?.destroy();
      editor.current = null;
      stage?.world.destroy({ children: true });
      stage?.app.destroy(true, { children: true });
    };
  }, [mode]);
  const seats = scene ? assignSeats(agents, scene) : new Map();
  const standing = scene ? assignStanding(agents, seats, scene) : new Map();
  const agent =
    selection?.type === "agent" ? agents.find((item) => item.id === selection.id) : undefined;
  const task =
    selection?.type === "task" ? tasks.find((item) => item.id === selection.id) : undefined;
  return (
    <main className="office-frame" aria-label={t("office.label")}>
      <TopBar
        title={scene?.title ?? t("office.title")}
        agents={agents}
        tasks={tasks}
        replaying={mode.mode === "replay"}
        onReplay={enterReplay}
      />
      <section className="pixel-panel avatar-strip" aria-label={t("roster.duty")}>
        <h2>{t("roster.duty")}</h2>
        {agents.map((item) => (
          <RosterItem key={item.id} agent={item} tasks={tasks} onSelect={selectAgent} />
        ))}
      </section>
      <div className={`office-body${task ? " has-detail" : ""}`}>
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
        {task ? (
          <TaskPanel task={task} agents={agents} onClose={closePanel} />
        ) : scene ? (
          <Roster
            standing={standing}
            zones={scene.zones.slice(2)}
            agents={agents}
            tasks={tasks}
            seats={seats}
            onSelect={selectAgent}
          />
        ) : null}
      </div>
      {agent && (
        <ProfileModal
          key={agent.id}
          agent={agent}
          agents={agents}
          tasks={tasks}
          admin={admin}
          onClose={closePanel}
        />
      )}
      {mode.mode === "replay" && (
        <ReplayBar
          start={controls.current.start}
          end={controls.current.end}
          at={at}
          playing={playing}
          speed={speed}
          onSpeed={setSpeed}
          onSeek={(at) => setMode({ mode: "replay", at })}
          onPlay={() => {
            if (at === controls.current.end)
              setMode({ mode: "replay", at: controls.current.start });
            setPlaying(!playing);
          }}
          onLive={() => setMode({ mode: "live" })}
        />
      )}
      {(error || dataError) && (
        <p className="office-error" role="alert">
          {error || dataError}
        </p>
      )}
      {editing && (
        <div className="editor-export">
          <PixelButton onClick={() => void editor.current?.exportJson()}>
            {t("editor.export")}
          </PixelButton>
        </div>
      )}
    </main>
  );
}
