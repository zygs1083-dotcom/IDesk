export function runTimes(
  startedAt: string | null,
  finishedAt: string | null,
  now: number,
): { text: string; title: string } {
  if (startedAt === null) return { text: "—", title: "" };
  const today = new Date(now);
  const format = (timestamp: string) => {
    const date = new Date(timestamp);
    const { day, time } = dateParts(date);
    const isToday = sameDay(date, today);
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

function sameDay(date: Date, today: Date): boolean {
  return date.toDateString() === today.toDateString();
}

function dateParts(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    day: `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

export function nextRunTime(next: Date, now: number): string {
  const { day, time } = dateParts(next);
  const minutes = time.slice(0, 5);
  return sameDay(next, new Date(now)) ? minutes : `${day} ${minutes}`;
}
