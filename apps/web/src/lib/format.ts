export function relativeTime(date: Date, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;

  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (day === today.getTime()) return time;
  today.setDate(today.getDate() - 1);
  if (day === today.getTime()) return `昨天 ${time}`;

  const monthDay = `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  return date.getFullYear() === now.getFullYear()
    ? monthDay
    : `${date.getFullYear()} 年 ${monthDay}`;
}

export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "—";
  const minutes = Math.floor(durationMs / 60_000);
  if (minutes < 1) return "不到 1 分";
  if (minutes < 60) return `${minutes} 分`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainder = minutes % 60;
    return remainder === 0 ? `${hours} 小时` : `${hours} 小时 ${remainder} 分`;
  }
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return remainder === 0 ? `${days} 天` : `${days} 天 ${remainder} 小时`;
}
