import { describe, expect, it } from "vitest";
import { fitSignText, PLAQUE_WIDTH } from "./zone-sign.ts";

const measure = (text: string, px: number) => Array.from(text).length * px * 0.6;

describe("zone sign text fitting", () => {
  it("keeps short names at 12 screen pixels", () => {
    expect(fitSignText("mac", 1, measure)).toEqual({ text: "mac", screenPx: 12 });
  });

  it("shrinks a medium name without truncating", () => {
    expect(fitSignText("studio-alpha", 0.7, measure)).toEqual({
      text: "studio-alpha",
      screenPx: 10,
    });
  });

  it("truncates long names at 9 screen pixels", () => {
    const fitted = fitSignText("very-long-hostname-for-testing · second-host", 1, measure);
    expect(fitted.screenPx).toBe(9);
    expect(fitted.text.endsWith("…")).toBe(true);
    expect(measure(fitted.text, 9)).toBeLessThanOrEqual(PLAQUE_WIDTH);
  });

  it("refits the full name as the stage shrinks and grows", () => {
    const text = "studio-alpha";
    expect(fitSignText(text, 1, measure)).toEqual({ text, screenPx: 12 });
    expect(fitSignText(text, 0.7, measure)).toEqual({ text, screenPx: 10 });
    expect(fitSignText(text, 0.4, measure).text).toMatch(/…$/);
    expect(fitSignText(text, 1.5, measure)).toEqual({ text, screenPx: 12 });
  });

  it("also fits the measured text height inside the frame", () => {
    expect(fitSignText("mac", 0.4, measure, (_text, px) => px)).toEqual({
      text: "mac",
      screenPx: 11,
    });
    expect(fitSignText("mac", 0.2, measure).text).toBe("");
  });

  it("preserves Unicode code points when truncating", () => {
    const fitted = fitSignText("😀".repeat(30), 1, measure);
    expect(fitted.text).toMatch(/^😀+…$/u);
  });

  it("keeps empty names empty", () => {
    expect(fitSignText("", 1, measure)).toEqual({ text: "", screenPx: 12 });
  });
});
