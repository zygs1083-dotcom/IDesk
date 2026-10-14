export function cronText(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [minute, hour, day, month, weekday] = parts as [string, string, string, string, string];
  if (month !== "*") return cron;
  if (day === "*" && weekday === "*" && hour === "*") {
    if (minute === "*") return "每分钟";
    if (/^\*\/[1-9]\d*$/.test(minute)) return `每 ${minute.slice(2)} 分钟`;
    if (/^\d+$/.test(minute) && Number(minute) < 60) return `每小时第 ${Number(minute)} 分`;
  }
  if (!/^\d+$/.test(minute) || Number(minute) > 59) return cron;
  if (!/^\d+$/.test(hour) || Number(hour) > 23) return cron;
  const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  if (day === "*") {
    if (weekday === "*") return `每天 ${time}`;
    if (weekday === "1-5") return `工作日 ${time}`;
    if (/^[0-7]$/.test(weekday)) {
      return `每周${["日", "一", "二", "三", "四", "五", "六", "日"][Number(weekday)]} ${time}`;
    }
  }
  if (weekday === "*" && /^\d+$/.test(day) && Number(day) >= 1 && Number(day) <= 31) {
    return `每月 ${Number(day)} 日 ${time}`;
  }
  return cron;
}
