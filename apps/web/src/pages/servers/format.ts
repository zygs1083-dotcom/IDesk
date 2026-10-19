import type { ServerRange } from "../../lib/use-servers.ts";

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

export function byteAxis(value: number, perSecond = false) {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const index =
    value > 0 ? Math.min(4, Math.max(0, Math.floor(Math.log(value) / Math.log(1024)))) : 0;
  const unit = 1024 ** index;
  const amount = value > 0 ? value / unit : 4;
  const minimum = amount / 4;
  const power = 10 ** Math.floor(Math.log10(minimum));
  const step = ([1, 2, 2.5, 4, 5, 10].find((factor) => factor * power >= minimum) ?? 10) * power;
  const count = Math.ceil(amount / step - 1e-10);
  const ticks = Array.from({ length: count + 1 }, (_, number) => {
    const scaled = Number((number * step).toPrecision(12));
    return {
      value: scaled * unit,
      label: number ? `${scaled} ${units[index]}${perSecond ? "/s" : ""}` : "0",
    };
  });
  return { max: Number((count * step).toPrecision(12)) * unit, ticks };
}

export function axisTime(date: Date, range: ServerRange): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return range === "7d" ? `${month}-${day}` : `${hour}:${minute}`;
}

export function tooltipTime(date: Date, range: ServerRange): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  if (range === "1h") return `${hour}:${minute}:${String(date.getSeconds()).padStart(2, "0")}`;
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${hour}:${minute}`;
}

export function timeTicks(start: number, end: number, range: ServerRange, narrow: boolean): Date[] {
  const dates: Date[] = [];
  const date = new Date(start);
  if (range === "7d") {
    date.setHours(0, 0, 0, 0);
    if (date.getTime() < start) date.setDate(date.getDate() + 1);
    while (date.getTime() <= end) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + (narrow ? 2 : 1));
    }
  } else {
    const interval = { "1h": 15, "6h": 60, "24h": 240 }[range] * (narrow ? 2 : 1);
    const minutes =
      date.getHours() * 60 +
      date.getMinutes() +
      date.getSeconds() / 60 +
      date.getMilliseconds() / 60000;
    date.setHours(0, Math.ceil(minutes / interval) * interval, 0, 0);
    while (date.getTime() <= end) {
      dates.push(new Date(date));
      date.setMinutes(date.getMinutes() + interval);
    }
  }
  return dates;
}
