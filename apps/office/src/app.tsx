import type { OfficeLayout } from "@idesk/shared/office-layout";
import { useCallback, useEffect, useRef, useState } from "react";
import { direct } from "./director/director.ts";
import { type ReplayControls, replay } from "./director/replay.ts";
import { setTimeScale } from "./engine/tween.ts";
import { useLang } from "./i18n/lang.tsx";
import { initialGlyphs, loadGlyphs } from "./stage/glyphs.ts";
import { BeijingClock } from "./ui/beijing-clock.tsx";
import { LoadingPanel } from "./ui/loading-panel.tsx";
import { type LoadingState, startLoading } from "./ui/loading-state.ts";
import { Outfits } from "./ui/outfits.tsx";
import { PanelHandle } from "./ui/panel-handle.tsx";
import { isFullscreenKey, type Panels, readPanels, savePanels } from "./ui/panel-state.ts";
import { PixelButton } from "./ui/pixel-button.tsx";
import { ProfileModal } from "./ui/profile-modal.tsx";
import { ReceptionProfile } from "./ui/reception-profile.tsx";
import { ReplayBar } from "./ui/replay-bar.tsx";
import { Roster } from "./ui/roster.tsx";
import { RosterItem } from "./ui/roster-item.tsx";
import { TaskPanel } from "./ui/task-panel.tsx";
import { TopBar } from "./ui/top-bar.tsx";
import { useOfficeData } from "./ui/use-office-data.ts";
import { loadWorldAssets } from "./world/assets.ts";
import { installDebug } from "./world/debug.ts";
import { loadLayout } from "./world/layout.ts";
import { assignSeats, assignStanding } from "./world/places.ts";
import { createStage } from "./world/stage.ts";

export function App() {
  const { t } = useLang();
  const stageText = useRef(t);
  stageText.current = t;
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<LoadingState>();
  const [panels, setPanels] = useState(() => readPanels(window.localStorage));
  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  const beforeFullscreen = useRef<Panels>(panels);
  const [fullscreen, setFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(false);
  const togglePanel = (panel: keyof Panels) => {
    setPanels((current) => {
      const next = { ...current, [panel]: !current[panel] };
      savePanels(window.localStorage, next);
      return next;
    });
  };
  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      beforeFullscreen.current = panelsRef.current;
      await document.documentElement.requestFullscreen();
    }
  }, []);
  useEffect(() => {
    const change = () => {
      const active = document.fullscreenElement === document.documentElement;
      setFullscreen(active);
      setPanels(active ? { top: false, left: false, right: false } : beforeFullscreen.current);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && document.fullscreenElement === document.documentElement) {
        void document.exitFullscreen();
        return;
      }
      if (isFullscreenKey(event)) {
        event.preventDefault();
        void toggleFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", change);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("keydown", keydown);
    };
  }, [toggleFullscreen]);
  useEffect(() => {
    if (!fullscreen) return;
    let timer: number;
    const move = () => {
      setShowFullscreenControls(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShowFullscreenControls(false), 3000);
    };
    document.addEventListener("mousemove", move);
    return () => {
      document.removeEventListener("mousemove", move);
      window.clearTimeout(timer);
    };
  }, [fullscreen]);
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
  const { agents, tasks, admin, agentName, error: dataError } = useOfficeData(mode.mode === "live");
  const adminRef = useRef(admin);
  adminRef.current = admin;
  const enterReplay = () => {
    const end = Date.now();
    controls.current.end = end;
    controls.current.start = end - 3600000;
    setAt(controls.current.start);
    setPlaying(true);
    setMode({ mode: "replay", at: controls.current.start });
  };
  const [world, setWorld] = useState<{ layout: OfficeLayout }>();
  const layout = world?.layout;
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
    const loading = startLoading(setLoading);
    setError("");
    let observer: ResizeObserver;
    let stage: Awaited<ReturnType<typeof createStage>>;
    const start = async () => {
      const layout = await loadLayout();
      loading.advance(5);
      const assets = await loadWorldAssets(mode.mode === "replay" ? mode.at : undefined);
      const element = host.current;
      if (!element || disposed) return;
      loading.advance(75);
      setWorld({ layout });
      await loadGlyphs(initialGlyphs);
      if (disposed) return;
      loading.advance(90);
      stage = await createStage(element, layout, assets);
      if (disposed) {
        stage.world.destroy({ children: true });
        stage.app.destroy(true, { children: true });
        return;
      }
      // Pixi renders at priority -25; only finish after that native canvas frame.
      stage.app.ticker.addOnce(() => loading.advance(100), undefined, -100);
      installDebug(stage, stageText.current, () => adminRef.current);
      observer = new ResizeObserver(() => stage.app.resize());
      observer.observe(element);
      setTimeScale(1);
      await (mode.mode === "live"
        ? direct(stage, stageText.current)
        : replay(stage, mode.at, controls.current, stageText.current));
    };
    void start().catch(() => {
      if (!disposed) {
        loading.fail();
        setError(stageText.current("office.loadFailed"));
      }
    });
    return () => {
      disposed = true;
      loading.dispose();
      observer?.disconnect();
      stage?.world.destroy({ children: true });
      stage?.app.destroy(true, { children: true });
    };
  }, [mode]);
  const seats = world ? assignSeats(agents, world.layout) : new Map();
  const standing = layout ? assignStanding(agents, seats, layout) : new Map();
  const agent =
    selection?.type === "agent" ? agents.find((item) => item.id === selection.id) : undefined;
  const task =
    selection?.type === "task" ? tasks.find((item) => item.id === selection.id) : undefined;
  return (
    <Outfits agents={agents}>
      <main
        className={`office-frame${fullscreen ? " is-fullscreen" : ""}`}
        aria-label={t("office.label")}
      >
        <div className={`top-shell${panels.top ? "" : " is-collapsed"}`}>
          <TopBar
            title={layout?.title ?? t("office.title")}
            agents={agents}
            tasks={tasks}
            replaying={mode.mode === "replay"}
            onReplay={enterReplay}
            onFullscreen={toggleFullscreen}
          />
          <PanelHandle
            expanded={panels.top}
            controls="office-top-bar"
            collapseLabel="panels.collapseTop"
            expandLabel="panels.expandTop"
            direction="top"
            onClick={() => togglePanel("top")}
          />
        </div>
        <section
          className={`pixel-panel avatar-strip${panels.left || panels.right ? "" : " is-collapsed"}`}
          aria-label={t("roster.duty")}
        >
          <h2>{t("roster.duty")}</h2>
          <PanelHandle
            expanded={panels.left}
            controls="avatar-left"
            collapseLabel="panels.collapseLeft"
            expandLabel="panels.expandLeft"
            direction="left"
            onClick={() => togglePanel("left")}
          />
          <span id="avatar-left" className="avatar-group">
            {agents
              .filter(
                (item) =>
                  panels.left &&
                  layout?.zones.slice(0, 2).some((zone) => seats.get(item.id)?.zone === zone.id),
              )
              .map((item) => (
                <RosterItem key={item.id} agent={item} tasks={tasks} onSelect={selectAgent} />
              ))}
          </span>
          <PanelHandle
            expanded={panels.right}
            controls="avatar-right"
            collapseLabel="panels.collapseRight"
            expandLabel="panels.expandRight"
            direction="right"
            onClick={() => togglePanel("right")}
          />
          <span id="avatar-right" className="avatar-group">
            {agents
              .filter(
                (item) =>
                  panels.right &&
                  (standing.has(item.id) ||
                    (seats.has(item.id) &&
                      !layout?.zones
                        .slice(0, 2)
                        .some((zone) => seats.get(item.id)?.zone === zone.id))),
              )
              .map((item) => (
                <RosterItem key={item.id} agent={item} tasks={tasks} onSelect={selectAgent} />
              ))}
          </span>
        </section>
        <div
          className={`office-body${task ? " has-detail" : ""}${panels.left ? "" : " left-collapsed"}${panels.right ? "" : " right-collapsed"}`}
        >
          {layout && (
            <div className={`side-shell side-shell-left${panels.left ? "" : " is-collapsed"}`}>
              <Roster
                id="office-left-roster"
                zones={layout.zones.slice(0, 2)}
                agents={agents}
                tasks={tasks}
                seats={seats}
                onSelect={selectAgent}
              />
              <PanelHandle
                expanded={panels.left}
                controls="office-left-roster"
                collapseLabel="panels.collapseLeft"
                expandLabel="panels.expandLeft"
                direction="left"
                onClick={() => togglePanel("left")}
              />
            </div>
          )}
          <div className="stage-host" ref={host}>
            <LoadingPanel state={loading} />
          </div>
          {task ? (
            <TaskPanel task={task} agents={agents} agentName={agentName} onClose={closePanel} />
          ) : layout ? (
            <div className={`side-shell side-shell-right${panels.right ? "" : " is-collapsed"}`}>
              <Roster
                id="office-right-roster"
                standing={standing}
                zones={layout.zones.slice(2)}
                agents={agents}
                tasks={tasks}
                seats={seats}
                onSelect={selectAgent}
              />
              <PanelHandle
                expanded={panels.right}
                controls="office-right-roster"
                collapseLabel="panels.collapseRight"
                expandLabel="panels.expandRight"
                direction="right"
                onClick={() => togglePanel("right")}
              />
            </div>
          ) : null}
        </div>
        {fullscreen && (
          <div className={`fullscreen-controls${showFullscreenControls ? " is-visible" : ""}`}>
            <BeijingClock compact />
            <PixelButton onClick={toggleFullscreen}>{t("top.exitFullscreen")}</PixelButton>
          </div>
        )}
        {selection?.type === "agent" && selection.id === "human" && (
          <ReceptionProfile onClose={closePanel} />
        )}
        {agent && (
          <ProfileModal
            key={agent.id}
            agent={agent}
            agentName={agentName}
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
      </main>
    </Outfits>
  );
}
