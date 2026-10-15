export function runTimes(
  startedAt: string | null,
  finishedAt: string | null,
  now: number,
): { text: string; title: string } {
  if (startedAt === null) return { text: "—", title: "" };
  const today = new Date(now);
  const pad = (value: number) => String(value).padStart(2, "0");
  const format = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    return {
      short: isToday ? time : `${day} ${time}`,
      full: `${date.getFullYear()}-${day} ${time}`,
    };
  };
  const start = format(startedAt);
  const end = finishedAt === null ? null : format(finishedAt);
  return {
    text: `${start.short} → ${end === null ? "…" : end.short}`,
    title: `${start.full} → ${end === null ? "…" : end.full}`,
  };
}
