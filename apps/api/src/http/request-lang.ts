import type { Lang } from "@idesk/shared/labels";

export function requestLang(header: string | undefined): Lang {
  return header?.toLowerCase().startsWith("en") ? "en" : "zh";
}
