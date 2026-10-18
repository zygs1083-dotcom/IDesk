import { useEffect, useState } from "react";
import { useLang } from "../i18n/lang.tsx";
import { beijingTime } from "./beijing-time.ts";

export function BeijingClock({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const { time, event, sun } = beijingTime(now);
  const [hour, minute] = time.split(":");
  return (
    <span className="beijing-clock">
      <span className="screen-reader-only">
        {t("top.beijing")} {time} · {t(`top.${event}`)} {sun}
      </span>
      <span aria-hidden="true">
        {t("top.beijing")} {hour}
        <span className={`clock-colon${now.getSeconds() % 2 ? " clock-colon-off" : ""}`}>:</span>
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
