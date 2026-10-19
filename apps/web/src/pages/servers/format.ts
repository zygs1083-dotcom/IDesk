export function bytes(value: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let index = 0;
  let amount = value;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index++;
  }
  return `${amount.toFixed(1)} ${units[index]}`;
}

export function rate(value: number): string {
  return `${bytes(value)}/s`;
}

export function percent(used: number, total: number): number {
  return total ? Math.round((used / total) * 100) : 0;
}

export function uptime(value: number, lang: "zh" | "en"): string {
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (lang === "zh")
    return days
      ? `${days} 天 ${hours} 小时`
      : hours
        ? `${hours} 小时 ${minutes} 分`
        : `${minutes} 分`;
  return days ? `${days} d ${hours} h` : hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((step) => step * base).find((step) => step >= value) ?? 10 * base;
}
