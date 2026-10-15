import { expect, test, vi } from "vitest";
import data from "../../public/scene.json";
import { translator } from "../i18n/translate.ts";
import { sceneSchema } from "../scene/scene.ts";
import { Cast } from "./cast.ts";
import { idleMoves } from "./idle-moves.ts";
import { ActionQueue } from "./queue.ts";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));

test.each([0, 1])("chat with a partner in zone %s uses the initiator's aisle", async (zone) => {
  const scene = sceneSchema.parse(data);
  const initiator = scene.zones[0]?.seats[0];
  const partner = scene.zones[zone]?.seats[1];
  if (!initiator || !partner) throw new Error("missing seats");
  const walk = vi.fn(async () => {});
  const bubble = { show: vi.fn() };
  const cast: Cast = Object.create(Cast.prototype);
  Object.assign(cast, {
    scene,
    queue: new ActionQueue(),
    stage: { world: { destroyed: false } },
    seats: new Map([
      ["a", initiator],
      ["b", partner],
    ]),
    characters: new Map([
      ["a", { ...initiator, state: "sit", bubble }],
      ["b", { ...partner, state: "sit", bubble }],
    ]),
    present: new Set(["a", "b"]),
    sleeping: new Set<string>(),
    walk,
    settle: vi.fn(),
  });
  await idleMoves(
    cast,
    new Map(),
    translator("en"),
    async () => {},
    () => 0,
  ).chat("a", "b");
  expect(walk.mock.calls.slice(0, 2)).toEqual([
    ["a", { x: 456, y: 263, via: "zone-1-1", facing: "right" }, 120],
    ["b", { x: 504, y: 263, via: "zone-1-1", facing: "left" }, 120],
  ]);
});
