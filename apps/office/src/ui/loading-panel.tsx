import { useEffect, useRef } from "react";
import { useLang } from "../i18n/lang.tsx";
import { characterSheets, receptionistImage } from "../world/characters.ts";
import { LoadingCopy, loadingPhrases } from "./loading-copy.tsx";
import type { LoadingState } from "./loading-state.ts";
import { LoadingWalker } from "./loading-walker.tsx";
import "./loading-panel.css";

export function LoadingPanel({ state }: { state: LoadingState | undefined }) {
  const { lang } = useLang();
  const panel = useRef<HTMLDivElement>(null);
  const sheet = characterSheets.get("receptionist");
  useEffect(() => {
    if (!state || !panel.current) return;
    panel.current.style.setProperty("--loading-progress", `${state.progress}%`);
  }, [state]);
  if (!state?.visible) return null;
  return (
    <div className={`office-loading${state.fading ? " is-fading" : ""}`} ref={panel}>
      <div
        className="pixel-panel loading-panel"
        role="progressbar"
        aria-label={lang === "zh" ? "正在布置办公室" : "Setting up the office"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={state.progress}
      >
        <div className="loading-track" aria-hidden="true">
          {sheet && receptionistImage && <LoadingWalker sheet={sheet} image={receptionistImage} />}
          <div className="loading-bar">
            <div className="loading-fill" />
          </div>
        </div>
        <p className="loading-percent" aria-hidden="true">
          {state.progress}%
        </p>
        <p className="loading-phrase" aria-hidden="true">
          <LoadingCopy text={loadingPhrases[lang][state.phrase] as string} />
        </p>
      </div>
    </div>
  );
}
