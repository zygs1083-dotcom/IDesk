import { expect, test, vi } from "vitest";
import type { Spot } from "../scene/scene.ts";
import type { CharacterState } from "../stage/character.ts";
import {
  chatSeats,
  idleDelay,
  idleDozing,
  idleEligible,
  idleNeighbor,
  idleSleepCapacity,
  idleSleepDuration,
  idleSpeed,
  idleStay,
  pickIdle,
  pickSpots,
} from "./idle-pick.ts";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));

const snapshot = new Map([["task", { status: "in_progress" as const, assigneeId: "busy" }]]);
const cast = {
  sleeping: new Set<string>(),
  present: new Set(["self", "near", "far", "busy"]),
  characters: new Map([
    ["self", { x: 0, y: 0, state: "idle" as CharacterState }],
    ["near", { x: 3, y: 4, state: "sit" as CharacterState }],
    ["far", { x: 30, y: 40, state: "idle" as CharacterState }],
    ["busy", { x: 1, y: 0, state: "sit" as CharacterState }],
    ["absent", { x: 0, y: 2, state: "idle" as CharacterState }],
  ]),
};

test.each(["idle", "sit"] as const)(
  "present %s characters without ongoing tasks qualify",
  (state) => {
    const characters = new Map([["self", { x: 0, y: 0, state }]]);
    expect(idleEligible({ ...cast, characters }, snapshot, "self")).toBe(true);
  },
);

test.each(["typing", "talk", "walk", "coffee", "away"] as const)(
  "%s characters do not qualify",
  (state) => {
    const characters = new Map([["self", { x: 0, y: 0, state }]]);
    expect(idleEligible({ ...cast, characters }, snapshot, "self")).toBe(false);
  },
);

test.each(["busy", "absent"])("excludes %s", (id) => {
  expect(idleEligible(cast, snapshot, id)).toBe(false);
});

test.each(["paused", "done", "assigned"] as const)(
  "a %s task does not block idle behavior",
  (status) => {
    expect(idleEligible(cast, new Map([["task", { status, assigneeId: "self" }]]), "self")).toBe(
      true,
    );
  },
);

test.each([
  [0, "stretch"],
  [0.499, "stretch"],
  [0.5, "spot"],
  [0.799, "spot"],
  [0.8, "chat"],
  [0.999, "chat"],
])("probability %s picks %s", (value, action) => {
  const values = [Number(value), 0];
  expect(pickIdle(() => values.shift() ?? 0, false)).toBe(action);
});

test.each([0, 0.49, 0.5, 0.99])("reduced motion only uses stretch and nod (%s)", (value) => {
  expect(["stretch", "nod"]).toContain(pickIdle(() => value, true));
});

test.each([0, 0.5, 0.8, 0.999])("two walkers force small actions (%s)", (value) => {
  expect(["stretch", "look", "nod"]).toContain(pickIdle(() => value, false, 2));
});

test("uniform timing and speed boundaries", () => {
  for (const [choose, low, high] of [
    [idleDelay, 10_000, 40_000],
    [idleStay, 2000, 6000],
    [idleSpeed, 120, 170],
  ] as const) {
    expect(choose(() => 0)).toBe(low);
    expect(choose(() => 0.5)).toBe((low + high) / 2);
    expect(choose(() => 1)).toBe(high);
  }
});

test("chat picks the nearest eligible neighbor and excludes self", () => {
  expect(idleNeighbor(cast, snapshot, "self")).toBe("near");
  expect(
    idleNeighbor({ ...cast, present: new Set(["self", "busy"]) }, snapshot, "self"),
  ).toBeUndefined();
});

test("spot chaining uses a quarter probability and a different destination", () => {
  const spots: Spot[] = [
    { id: "coffee", x: 10, y: 20, via: "coffee", facing: "up" },
    { id: "sofa", x: 30, y: 40, via: "sofa", facing: "up" },
  ];
  const values = [0, 0.2499, 0];
  expect(pickSpots(spots, () => values.shift() ?? 0)).toEqual(spots);
  expect(pickSpots(spots, () => 0.25)).toEqual([spots[0]]);
});

test("chat positions straddle the aisle point and face each other", () => {
  expect(chatSeats({ id: "aisle", x: 480, y: 263 })).toEqual([
    { x: 456, y: 263, via: "aisle", facing: "right" },
    { x: 504, y: 263, via: "aisle", facing: "left" },
  ]);
});

test("dozing begins at three minutes and activity resets the threshold", () => {
  expect(idleDozing(cast, snapshot, "self", 0, 179_999)).toBe(false);
  expect(idleDozing(cast, snapshot, "self", 0, 180_000)).toBe(true);
  expect(idleDozing(cast, snapshot, "busy", 0, 180_000)).toBe(false);
  expect(idleDozing(cast, snapshot, "self", 180_000, 180_001)).toBe(false);
});

test("sleep lasts sixty to one hundred eighty seconds", () => {
  expect(idleSleepDuration(() => 0)).toBe(60_000);
  expect(idleSleepDuration(() => 0.5)).toBe(120_000);
  expect(idleSleepDuration(() => 1)).toBe(180_000);
});

test.each([
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 1],
  [5, 1],
  [6, 2],
  [8, 2],
])("%s eligible people allow %s sleepers", (count, capacity) => {
  expect(idleSleepCapacity(count)).toBe(capacity);
});

test("sleepers neither initiate idle actions nor become chat partners", () => {
  const sleepingCast = { ...cast, sleeping: new Set(["self", "near"]) };
  expect(idleEligible(sleepingCast, snapshot, "self")).toBe(false);
  expect(idleNeighbor(sleepingCast, snapshot, "self")).toBe("far");
});

test("ignoreSleep counts sleepers without relaxing other eligibility rules", () => {
  const sleepingCast = { ...cast, sleeping: new Set(["self", "busy"]) };
  expect(idleEligible(sleepingCast, snapshot, "self", true)).toBe(true);
  expect(idleEligible(sleepingCast, snapshot, "busy", true)).toBe(false);
});
