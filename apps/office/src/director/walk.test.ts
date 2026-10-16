import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { expect, test, vi } from "vitest";
import rawLayout from "../../public/layout.json";
import { cellCenter, cellOf, type Point, walkableGrid } from "../world/path.ts";
import { Cast } from "./cast.ts";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));
const layout = parseOfficeLayout(rawLayout);

test("leaving a seated position crosses its cell center, avoids furniture, and ends at the exact seat", async () => {
  const available = layout.seats;
  const start = available.find((seat) => seat.id === layout.zones[0]?.seats[0]);
  const target = available.find((seat) => seat.id === layout.meeting.seats[4]);
  if (!start || !target) throw new Error("Missing seats");
  const walkTo = vi.fn(async (_points: Point[], _speed?: number) => {});
  const character = {
    position: { x: start.x, y: start.y },
    facing: start.facing,
    destroyed: false,
    walkTo,
  };
  const cast: Cast = Object.create(Cast.prototype);
  Object.assign(cast, {
    stage: { layout },
    stopping: new Map(),
    characters: new Map([["agent", character]]),
  });
  await cast.walk("agent", target, 150);
  const call = walkTo.mock.calls[0];
  if (!call) throw new Error("No walk");
  const [points, speed] = call;
  expect(points[0]).toEqual(cellCenter(cellOf(start)));
  expect(points.at(-1)).toEqual(target);
  expect(speed).toBe(150);
  expect(character.facing).toBe(target.facing);
  const grid = walkableGrid(layout);
  for (const point of points.slice(0, -1)) {
    const cell = cellOf(point);
    expect(grid[cell.y]?.[cell.x]).toBe(true);
  }
});
