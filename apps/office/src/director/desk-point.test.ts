import { expect, it } from "vitest";
import type { Direction } from "../scene/scene.ts";
import { deskPoint } from "./desk-point.ts";

it.each([
  ["down", 138, 215],
  ["up", 138, 145],
  ["left", 65, 225],
  ["right", 135, 225],
] satisfies [Direction, number, number][])("places cards on the %s desk", (facing, x, y) => {
  expect(deskPoint({ x: 100, y: 200, facing, via: "desk" })).toEqual({ x, y });
});

it.each(["down", "up"] as const)("mirrors the %s desk card with the seat", (facing) => {
  const point = deskPoint({ x: 100, y: 200, facing, via: "desk", mirror: true });
  expect(point.x).toBe(62);
  expect(point.y).toBe(facing === "down" ? 215 : 145);
});
