import type { Text } from "pixi.js";
import { en } from "../i18n/en.ts";
import { zh } from "../i18n/zh.ts";

const pending = new WeakMap<Text, object>();
export const initialGlyphs = `${Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32)).join("")}${Object.values(zh).join("")}${Object.values(en).join("")}`;

export function loadGlyphs(text: string) {
  return document.fonts.load('12px "Fusion Pixel"', text);
}

export async function setGlyphText(target: Text, text: string, applied?: () => void) {
  const request = {};
  pending.set(target, request);
  await loadGlyphs(text);
  if (target.destroyed || pending.get(target) !== request) return;
  target.text = text;
  applied?.();
}
