import { expect, test, vi } from "vitest";
import type { Seat } from "../scene/scene.ts";
import type { CharacterState } from "../stage/character.ts";
import { idleCoffee, idleDelay, idleEligible, idleNeighbor, pickIdle } from "./idle.ts";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));

const snapshot = new Map([["task", { status: "in_progress" as const, assigneeId: "busy" }]]);
const cast = {
  present: new Set(["self", "near", "far", "busy", "human"]),
  characters: new Map([
    ["self", { x: 0, y: 0, state: "idle" as CharacterState }],
    ["near", { x: 3, y: 4, state: "sit" as CharacterState }],
    ["far", { x: 30, y: 40, state: "idle" as CharacterState }],
    ["busy", { x: 1, y: 0, state: "sit" as CharacterState }],
    ["human", { x: 0, y: 1, state: "sit" as CharacterState }],
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

test.each(["busy", "human", "absent"])("excludes %s", (id) => {
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
  [0.199, "stretch"],
  [0.2, "look"],
  [0.399, "look"],
  [0.4, "coffee"],
  [0.599, "coffee"],
  [0.6, "chat"],
  [0.799, "chat"],
  [0.8, "board"],
  [0.999, "board"],
])("random %s selects %s", (value, action) => {
  expect(pickIdle(() => Number(value), false)).toBe(action);
});

test.each([0, 0.2, 0.4, 0.6, 0.8, 0.999])(
  "reduced motion always selects bubbles for %s",
  (value) => {
    expect(pickIdle(() => value, true)).toBe("stretch");
  },
);

test("delay is uniform from twenty to sixty seconds", () => {
  expect(idleDelay(() => 0)).toBe(20_000);
  expect(idleDelay(() => 0.5)).toBe(40_000);
  expect(idleDelay(() => 0.999999)).toBeCloseTo(59_999.96);
});

test("chat picks the nearest eligible neighbor and excludes self", () => {
  expect(idleNeighbor(cast, snapshot, "self")).toBe("near");
  expect(
    idleNeighbor({ ...cast, present: new Set(["self", "busy"]) }, snapshot, "self"),
  ).toBeUndefined();
});

test("coffee uses a free spot and skips a fully occupied lounge", () => {
  const spots: Seat[] = [
    { x: 10, y: 20, via: "coffee", facing: "up" },
    { x: 30, y: 40, via: "sofa", facing: "up" },
  ];
  expect(idleCoffee(spots, [{ ...spots[0], x: 10, y: 20, state: "coffee" }])).toEqual(spots[1]);
  expect(
    idleCoffee(
      spots,
      spots.map((spot) => ({ ...spot, state: "coffee" })),
    ),
  ).toBeUndefined();
  expect(
    idleCoffee(
      spots,
      spots.map((spot) => ({ ...spot, state: "walk" })),
    ),
  ).toEqual(spots[0]);
});
