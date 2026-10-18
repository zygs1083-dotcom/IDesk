import { useEffect, useState } from "react";
import { useLang } from "../i18n/lang.tsx";
import { officeNow } from "../stage/daylight-time.ts";
import { beijingTime } from "./beijing-time.ts";

export function BeijingClock({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const now = officeNow();
  const { time, event, sun } = beijingTime(now);
  const [hour, minute] = time.split(":");
  return (
    <span className="beijing-clock">
      <span className="screen-reader-only">
        {t("top.beijing")} {time} · {t(`top.${event}`)} {sun}
      </span>
      <span aria-hidden="true">
        {t("top.beijing")} {hour}
        <span className={`clock-colon${tick % 2 ? " clock-colon-off" : ""}`}>:</span>
        {minute}
      </span>
      {!compact && (
        <span aria-hidden="true">
          {" "}
          · {t(`top.${event}`)} {sun}
        </span>
      )}
    </span>
  );
}
