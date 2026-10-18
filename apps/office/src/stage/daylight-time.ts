import { sunAltitude } from "../lib/sun.ts";

export type DaylightWeights = { day: number; dusk: number; night: number };

export function weightsForAltitude(altitude: number): DaylightWeights {
  if (altitude >= 10) return { day: 1, dusk: 0, night: 0 };
  if (altitude >= 0) return { day: altitude / 10, dusk: 1 - altitude / 10, night: 0 };
  if (altitude > -8) return { day: 0, dusk: (altitude + 8) / 8, night: -altitude / 8 };
  return { day: 0, dusk: 0, night: 1 };
}

export function daylightWeights(date: Date): DaylightWeights {
  return weightsForAltitude(sunAltitude(date));
}

export function parseBeijingTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  const date = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
  const beijing = new Date(date.getTime() + 8 * 3_600_000);
  return beijing.getUTCFullYear() === year &&
    beijing.getUTCMonth() + 1 === month &&
    beijing.getUTCDate() === day &&
    beijing.getUTCHours() === hour &&
    beijing.getUTCMinutes() === minute &&
    beijing.getUTCSeconds() === second
    ? date
    : null;
}

export function daylightTime(search: string, openedAt = Date.now()): () => Date {
  const params = new URLSearchParams(search);
  const fixed = params.get("time");
  const fixedDate = fixed ? parseBeijingTime(fixed) : null;
  const base = fixedDate?.getTime() ?? openedAt;
  const speed = Number(params.get("timelapse"));
  if (Number.isFinite(speed) && speed > 0)
    return () => new Date(base + (Date.now() - openedAt) * speed);
  if (fixedDate) return () => new Date(base);
  return () => new Date();
}

const pageOpenedAt = Date.now();
let browserTime: (() => Date) | undefined;

export function officeNow(): Date {
  browserTime ??= daylightTime(location.search, pageOpenedAt);
  return browserTime();
}

export function clockAngles(date: Date): { hour: number; minute: number } {
  const beijing = new Date(date.getTime() + 8 * 3_600_000);
  const minute = beijing.getUTCMinutes();
  return {
    hour: ((beijing.getUTCHours() % 12) + minute / 60) * (Math.PI / 6),
    minute: minute * (Math.PI / 30),
  };
}
