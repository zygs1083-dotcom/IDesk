import { expect, test } from "vitest";
import { worldScale } from "./scale.ts";

test("large window uses integer magnification", () => {
  expect(worldScale(3000, 2000, 1280, 768)).toBe(2);
  expect(worldScale(1440, 900, 1280, 768)).toBe(1);
});
test("small window keeps its actual fit ratio", () => {
  expect(worldScale(640, 500, 1280, 768)).toBe(0.5);
});
