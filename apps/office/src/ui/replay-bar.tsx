import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/lang.tsx";
import { PixelButton } from "./pixel-button.tsx";
import "./replay-bar.css";

export function ReplayBar({
  start,
  end,
  at,
  playing,
  speed,
  onSeek,
  onPlay,
  onSpeed,
  onLive,
}: {
  start: number;
  end: number;
  at: number;
  playing: boolean;
  speed: number;
  onSeek: (at: number) => void;
  onPlay: () => void;
  onSpeed: (speed: number) => void;
  onLive: () => void;
}) {
  const { lang, t } = useLang();
  const time = (at: number) =>
    new Intl.DateTimeFormat(lang, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(at);
  const ticks = Array.from({ length: 7 }, (_, i) => start + i * 600000);
  const [draft, setDraft] = useState<number>();
  const slider = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = slider.current;
    const commit = () => {
      onSeek(Number(element?.value));
      setDraft(undefined);
    };
    element?.addEventListener("change", commit);
    return () => element?.removeEventListener("change", commit);
  }, [onSeek]);
  return (
    <section className="pixel-panel replay-bar" aria-label={t("replay.controls")}>
      <div className="replay-timeline">
        <label htmlFor="replay-time">{time(draft ?? at)}</label>
        <input
          ref={slider}
          id="replay-time"
          aria-label={t("replay.time")}
          type="range"
          min={start}
          max={end}
          value={draft ?? at}
          step={1000}
          list="replay-ticks"
          onChange={(event) => setDraft(Number(event.target.value))}
        />
        <datalist id="replay-ticks">
          {ticks.map((tick) => (
            <option key={tick} value={tick} label={time(tick)} />
          ))}
        </datalist>
        <div className="replay-ticks" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{time(tick)}</span>
          ))}
        </div>
      </div>
      <PixelButton onClick={onPlay}>{t(playing ? "replay.pause" : "replay.play")}</PixelButton>
      <div className="replay-speeds">
        {[1, 10, 60].map((value) => (
          <PixelButton key={value} aria-pressed={speed === value} onClick={() => onSpeed(value)}>
            {value}×
          </PixelButton>
        ))}
      </div>
      <PixelButton onClick={onLive}>{t("replay.live")}</PixelButton>
    </section>
  );
}
