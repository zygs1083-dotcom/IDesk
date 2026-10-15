import { useSyncExternalStore } from "react";
import { soundState, toggleSound } from "../engine/sound.ts";
import { useLang } from "../i18n/lang.tsx";
import { PixelButton } from "./pixel-button.tsx";
import type { Agent, Task } from "./use-office-data.ts";

export function TopBar({
  title,
  agents,
  tasks,
  replaying,
  onReplay,
}: {
  replaying: boolean;
  onReplay: () => void;
  title: string;
  agents: Agent[];
  tasks: Task[];
}) {
  const { lang, setLang, t } = useLang();
  const sound = useSyncExternalStore(soundState.subscribe, soundState.getSnapshot);
  return (
    <header className="pixel-panel top-bar">
      <div>
        <h1>{title}</h1>
        <p>
          {t("top.summary", {
            agents: agents.filter((agent) => agent.status === "online").length,
            tasks: tasks.filter((task) => task.status === "in_progress").length,
          })}
        </p>
      </div>
      <div className="top-bar-actions">
        <PixelButton
          className="language-switch"
          aria-label={t("top.switchLanguage")}
          onClick={() => setLang(({ zh: "en", en: "zh" } as const)[lang])}
        >
          <span className={lang !== "en" ? "language-inactive" : ""}>EN</span>
          <span aria-hidden="true"> / </span>
          <span className={lang !== "zh" ? "language-inactive" : ""}>中</span>
        </PixelButton>
        <PixelButton aria-label={t("top.sound")} aria-pressed={sound} onClick={toggleSound}>
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
        <PixelButton aria-pressed={replaying} onClick={onReplay}>
          {t("top.replay")}
        </PixelButton>
        <PixelButton href="/desk">{t("top.board")}</PixelButton>
      </div>
    </header>
  );
}
