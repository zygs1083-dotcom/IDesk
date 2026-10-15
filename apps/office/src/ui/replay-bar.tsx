import { useEffect, useRef, useState } from "react";
import { PixelButton } from "./pixel-button.tsx";
import "./replay-bar.css";

const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

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
    <section className="pixel-panel replay-bar" aria-label="回放控制">
      <div className="replay-timeline">
        <label htmlFor="replay-time">{time(draft ?? at)}</label>
        <input
          ref={slider}
          id="replay-time"
          aria-label="回放时间"
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
      <PixelButton onClick={onPlay}>{playing ? "暂停" : "播放"}</PixelButton>
      <div className="replay-speeds">
        {[1, 10, 60].map((value) => (
          <PixelButton key={value} aria-pressed={speed === value} onClick={() => onSpeed(value)}>
            {value}×
          </PixelButton>
        ))}
      </div>
      <PixelButton onClick={onLive}>回到现场</PixelButton>
    </section>
  );
}
