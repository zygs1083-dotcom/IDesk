import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { Container } from "pixi.js";
import { afterEach, expect, test, vi } from "vitest";
import data from "../../public/layout.json";
import { translator } from "../i18n/translate.ts";
import type { Target } from "../world/places.ts";
import { Cast } from "./cast.ts";
import { idleMoves } from "./idle-moves.ts";
import { ActionQueue } from "./queue.ts";
import { returnToSeat } from "./return-to-seat.ts";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));
afterEach(() => vi.useRealTimers());

function scene() {
  vi.useFakeTimers();
  const layout = parseOfficeLayout(data);
  const seat = layout.seats.find((seat) => seat.zone);
  if (!seat) throw new Error("Missing work seat");
  const world = new Container();
  const cast: Cast = Object.create(Cast.prototype);
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const character = {
    ...seat,
    state: "sit",
    bubble: { show: vi.fn() },
    setState(state: string) {
      this.state = state;
    },
    stopWalking: vi.fn(),
  };
  const walk = vi.fn(async (_id: string, target: Target) => {
    character.state = "walk";
    await wait(2000);
    Object.assign(character, { x: target.x, y: target.y, state: "idle" });
  });
  Object.assign(cast, {
    stage: { world, layout },
    characters: new Map([["a", character]]),
    seats: new Map([["a", seat]]),
    present: new Set(["a"]),
    sleeping: new Set(),
    lastActive: new Map(),
    standing: new Map(),
    queue: new ActionQueue((id) => returnToSeat(cast, id)),
    walk,
  });
  const moves = idleMoves(cast, new Map(), translator("en"), wait, () => 0.5);
  world.on("office:interrupt", moves.cancel);
  return { cast, character, walk, moves, seat };
}

test("frequent heartbeats preserve the original idle route and finish seated", async () => {
  const { cast, character, walk, moves, seat } = scene();
  const trip = cast.queue.enqueue("a", () => moves.spot("a"));
  const timer = setInterval(() => cast.active("a"), 1000);
  await vi.advanceTimersByTimeAsync(15_000);
  await trip;
  clearInterval(timer);
  expect(character.stopWalking).not.toHaveBeenCalled();
  expect(walk.mock.calls).toHaveLength(2);
  expect(walk.mock.calls[0]?.[1]).toEqual(cast.stage.layout.spots[4]);
  expect(walk.mock.calls[1]?.[1]).toEqual(seat);
  expect(character).toMatchObject({ x: seat.x, y: seat.y, state: "sit" });
});

test("claim interrupts an idle trip and queue drain seats the character after completion", async () => {
  const { cast, character, moves, seat, walk } = scene();
  void cast.queue.enqueue("a", () => moves.spot("a"));
  await vi.advanceTimersByTimeAsync(500);
  const claim = cast.enqueue("a", () => character.setState("typing"));
  expect(character.stopWalking).toHaveBeenCalledOnce();
  const complete = cast.enqueue("a", () => cast.settle("a", "sit"), false);
  await vi.advanceTimersByTimeAsync(10_000);
  await Promise.all([claim, complete]);
  expect(walk.mock.calls.at(-1)?.[1]).toEqual(seat);
  expect(character).toMatchObject({ x: seat.x, y: seat.y, state: "sit" });
});

test.each(["talk", "coffee"])("drain preserves a %s destination", async (state) => {
  const { cast, character, walk } = scene();
  character.x += 100;
  await cast.queue.enqueue("a", () => character.setState(state));
  expect(walk).not.toHaveBeenCalled();
});
