import { expect, test, vi } from "vitest";
import rawCatalog from "../../public/catalog.json";
import data from "../../public/layout.json";
import { translator } from "../i18n/translate.ts";
import { catalogSchema } from "../world/catalog.ts";
import { parseLayout } from "../world/layout.ts";
import { chatSeats } from "../world/places.ts";
import { seats } from "../world/seats.ts";
import { Cast } from "./cast.ts";
import { idleMoves } from "./idle-moves.ts";
import { ActionQueue } from "./queue.ts";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));

test.each([0, 1])("chat with a partner in zone %s uses the initiator's aisle", async (zone) => {
  const catalog = catalogSchema.parse(rawCatalog);
  const layout = parseLayout(data, catalog);
  const available = seats(layout, catalog);
  const initiator = available.find((seat) => seat.id === layout.zones[0]?.chairs[0]);
  const partner = available.find((seat) => seat.id === layout.zones[zone]?.chairs[1]);
  if (!initiator || !partner) throw new Error("missing seats");
  const walk = vi.fn(async () => {});
  const bubble = { show: vi.fn() };
  const cast: Cast = Object.create(Cast.prototype);
  Object.assign(cast, {
    queue: new ActionQueue(),
    stage: { world: { destroyed: false }, layout, catalog },
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
  const targets = chatSeats(initiator, layout, catalog);
  expect(targets).toBeDefined();
  expect(walk.mock.calls.slice(0, 2)).toEqual([
    ["a", targets?.[0], 120],
    ["b", targets?.[1], 120],
  ]);
});
