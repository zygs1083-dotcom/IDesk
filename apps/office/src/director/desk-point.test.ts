import { expect, it } from "vitest";
import type { Direction } from "../scene/scene.ts";
import { deskPoint } from "./desk-point.ts";

it.each([
  ["down", 100, 225],
  ["up", 140, 145],
  ["left", 65, 225],
  ["right", 135, 225],
] satisfies [Direction, number, number][])("places cards on the %s desk", (facing, x, y) => {
  expect(deskPoint({ x: 100, y: 200, facing, via: "desk" })).toEqual({ x, y });
});
