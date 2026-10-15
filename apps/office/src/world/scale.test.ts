import { expect, test } from "vitest";
import { worldScale } from "./scale.ts";

test("large window uses the exact proportional fit", () => {
  expect(worldScale(3000, 2000, 1280, 768)).toBe(3000 / 1280);
  expect(worldScale(1440, 900, 1280, 768)).toBe(1440 / 1280);
});
test("small window keeps its actual fit ratio", () => {
  expect(worldScale(640, 500, 1280, 768)).toBe(0.5);
});
