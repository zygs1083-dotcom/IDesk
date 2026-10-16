import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { expect, test, vi } from "vitest";
import data from "../../public/layout.json";
import { translator } from "../i18n/translate.ts";
import type { SpotId } from "../world/places.ts";
import { Cast } from "./cast.ts";
import { idleSpots } from "./idle-spots.ts";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));

function scene(ids: SpotId[], walking = false) {
  const layout = parseOfficeLayout(data);
  layout.spots = layout.spots.filter((spot) => ids.includes(spot.id));
  const waits: (() => void)[] = [];
  const walks: (() => void)[] = [];
  const cast: Cast = Object.create(Cast.prototype);
  const walk = vi.fn<Cast["walk"]>(() =>
    walking ? new Promise<void>((resolve) => walks.push(resolve)) : Promise.resolve(),
  );
  const bubble = { show: vi.fn() };
  const stopWalking = vi.fn();
  Object.assign(cast, {
    stage: { world: { destroyed: false }, layout },
    walk,
    characters: new Map(["a", "b", "c"].map((id) => [id, { bubble, stopWalking }])),
  });
  const small = vi.fn(async () => {}),
    home = vi.fn(async () => {});
  const moves = idleSpots(
    cast,
    translator("en"),
    () => new Promise<void>((resolve) => waits.push(resolve)),
    () => 0.5,
    small,
    home,
  );
  return { moves, walk, waits, walks, small, home, layout, bubble, stopWalking };
}

const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test.each(["printer", "coffee"] as const)(
  "a second visitor to %s picks another destination",
  async (id) => {
    const { moves, walk, waits, home, layout } = scene([id, "window"]);
    const first = moves.visit("a");
    await tick();
    const second = moves.visit("b");
    await tick();
    expect(walk.mock.calls).toEqual([
      ["a", layout.spots[1], 145],
      ["b", layout.spots[0], 145],
    ]);
    for (const resolve of waits) resolve();
    await Promise.all([first, second]);
    expect(home).toHaveBeenCalledTimes(2);
    const next = moves.visit("c");
    await tick();
    expect(walk.mock.calls.at(-1)?.[1]).toEqual(layout.spots[1]);
    waits.at(-1)?.();
    await next;
  },
);

test("full destinations produce a small action without walking", async () => {
  const { moves, walk, waits, small } = scene(["printer"]);
  const first = moves.visit("a");
  await tick();
  await moves.visit("b");
  expect(small).toHaveBeenCalledWith("b");
  expect(walk).toHaveBeenCalledTimes(1);
  waits[0]?.();
  await first;
});

test("an approaching visitor reserves its spot and real activity releases it before arrival", async () => {
  const { moves, walk, walks, waits, small, home, stopWalking, bubble } = scene(["coffee"], true);
  const first = moves.visit("a");
  await moves.visit("b");
  expect(small).toHaveBeenCalledWith("b");
  moves.cancel("a");
  expect(stopWalking).toHaveBeenCalledOnce();
  const second = moves.visit("b");
  expect(walk).toHaveBeenCalledTimes(2);
  walks[0]?.();
  await first;
  expect(home).not.toHaveBeenCalled();
  expect(bubble.show).not.toHaveBeenCalled();
  walks[1]?.();
  await tick();
  waits[0]?.();
  await second;
});

test("real activity interrupts a stay and releases occupancy without waiting for the timer", async () => {
  const { moves, walk, waits, home } = scene(["printer"]);
  const first = moves.visit("a");
  await tick();
  moves.cancel("a");
  await first;
  expect(home).not.toHaveBeenCalled();
  const second = moves.visit("b");
  await tick();
  expect(walk).toHaveBeenCalledTimes(2);
  waits.at(-1)?.();
  await second;
});
