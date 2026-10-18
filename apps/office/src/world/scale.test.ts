import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { expect, test } from "vitest";
import raw from "../../public/layout.json";
import { requiredBounds, worldScale } from "./scale.ts";

const layout = parseOfficeLayout(raw);
const required = requiredBounds(layout);

test.each([
  [1440, 900],
  [1920, 1080],
  [1000, 600],
  [500, 1000],
  [2000, 400],
])("keeps key areas visible and limits crop at %i x %i", (width, height) => {
  const { scale, x, y } = worldScale(width, height, layout.size.w, layout.size.h, required);
  const left = -x / scale;
  const right = (width - x) / scale;
  const top = -y / scale;
  const bottom = (height - y) / scale;
  expect(left).toBeLessThanOrEqual(required.left + 0.001);
  expect(top).toBeLessThanOrEqual(required.top + 0.001);
  expect(right).toBeGreaterThanOrEqual(required.right - 0.001);
  expect(bottom).toBeGreaterThanOrEqual(required.bottom - 0.001);
  expect(Math.max(0, left)).toBeLessThanOrEqual(layout.size.w * 0.06 + 0.001);
  expect(Math.max(0, layout.size.w - right)).toBeLessThanOrEqual(layout.size.w * 0.06 + 0.001);
  expect(Math.max(0, top)).toBeLessThanOrEqual(layout.size.h * 0.06 + 0.001);
  expect(Math.max(0, layout.size.h - bottom)).toBeLessThanOrEqual(layout.size.h * 0.06 + 0.001);
  expect(scale).toBeGreaterThanOrEqual(Math.min(width / layout.size.w, height / layout.size.h));
});
