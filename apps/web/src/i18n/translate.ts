import type { Lang } from "@idesk/shared/labels";
import { en } from "./en.ts";
import { format } from "./format.ts";
import { type Key, zh } from "./zh.ts";

export type Translate = (key: Key, params?: Record<string, string | number>) => string;

export function translator(lang: Lang): Translate {
  return (key, params) => format((lang === "zh" ? zh : en)[key], params);
}
