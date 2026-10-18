import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { expect, test } from "vitest";
import raw from "../../public/layout.json";
import { requiredBounds, worldScale } from "./scale.ts";

const layout = parseOfficeLayout(raw);
const required = requiredBounds(layout);

test("includes the wall clock with margin in the visible bounds", () => {
  expect(required.left).toBeLessThanOrEqual(layout.clock.x - layout.clock.r - 6);
  expect(required.top).toBeLessThanOrEqual(layout.clock.y - layout.clock.r - 6);
  expect(required.right).toBeGreaterThanOrEqual(layout.clock.x + layout.clock.r + 6);
  expect(required.bottom).toBeGreaterThanOrEqual(layout.clock.y + layout.clock.r + 6);
});

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

test.each([
  [1440, 900],
  [1920, 1080],
  [1000, 600],
  [500, 1000],
  [2000, 400],
])("fills each axis where the scaled scene is larger at %i x %i", (width, height) => {
  const { scale, x, y } = worldScale(width, height, layout.size.w, layout.size.h, required);
  const sceneWidth = layout.size.w * scale;
  const sceneHeight = layout.size.h * scale;
  if (sceneWidth >= width) {
    expect(x).toBeLessThanOrEqual(0);
    expect(x + sceneWidth).toBeGreaterThanOrEqual(width - 0.001);
  }
  if (sceneHeight >= height) {
    expect(y).toBeLessThanOrEqual(0);
    expect(y + sceneHeight).toBeGreaterThanOrEqual(height - 0.001);
  }
});

test("keeps an oversized scene flush when key areas are off-center", () => {
  const { scale, x } = worldScale(200, 101, 200, 100, {
    left: 100,
    top: 40,
    right: 180,
    bottom: 60,
  });
  expect(x).toBeLessThanOrEqual(0);
  expect(x + 200 * scale).toBeGreaterThanOrEqual(200);
});
