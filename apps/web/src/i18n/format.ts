import type { Lang } from "@idesk/shared/labels";

export function initialLang(stored: string | null, navigatorLanguage: string): Lang {
  return stored === "zh" || stored === "en"
    ? stored
    : navigatorLanguage.startsWith("zh")
      ? "zh"
      : "en";
}

export function format(template: string, params?: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    params && name in params ? String(params[name]) : placeholder,
  );
}
