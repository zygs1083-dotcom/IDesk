import { expect, test } from "vitest";
import { boardLayout } from "./board-layout.ts";

test("cards fit the measured textArea in 21 by 15 cells", () => {
  const layout = boardLayout(112, 48, 15);
  expect(layout.visible).toBe(15);
  expect(layout.overflow).toBe(0);
  expect(layout.point(14)).toEqual({ x: 92, y: 35 });
});
test("overflow reserves the final slot for +N", () => {
  const layout = boardLayout(112, 48, 20);
  expect(layout.visible).toBe(14);
  expect(layout.overflow).toBe(6);
  expect(layout.overflowPoint).toEqual(layout.point(14));
});
