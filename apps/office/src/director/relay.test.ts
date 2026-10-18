import { expect, test, vi } from "vitest";
import type { Cast } from "./cast.ts";
import { relayAction } from "./relay.ts";

vi.mock("../stage/effects.ts", () => ({ envelope: vi.fn(async () => {}) }));
vi.mock("../engine/sound.ts", () => ({ playSound: vi.fn() }));
vi.mock("./destinations.ts", () => ({ destinations: () => ({ bulletin: { x: 10, y: 20 } }) }));

test("a seated recipient looks up without switching to an unavailable frontal frame", async () => {
  const character = { position: { x: 20, y: 30 }, facing: "back", nod: vi.fn(async () => {}) };
  const cast = {
    stage: {},
    characters: new Map([["recipient", character]]),
    reception: { x: 0, y: 0 },
    desk: () => undefined,
    enqueue: async (_id: string, action: () => Promise<void>) => action(),
  } as unknown as Cast;
  relayAction(cast)({ kind: "relay", agentId: "human", to: { kind: "agent", id: "recipient" } });
  await vi.waitFor(() => expect(character.nod).toHaveBeenCalledWith(150, 1));
  expect(character.facing).toBe("back");
});

test("a human envelope lands at reception and the receptionist nods", async () => {
  const { envelope } = await import("../stage/effects.ts");
  const receptionist = { position: { x: 1, y: 2 }, nod: vi.fn(async () => {}) };
  const cast = {
    stage: {},
    characters: new Map([
      ["human", receptionist],
      ["sender", { ...receptionist, position: { x: 40, y: 50 } }],
    ]),
    reception: { x: 10, y: 20 },
    desk: () => undefined,
    enqueue: async (_id: string, action: () => Promise<void>) => action(),
  } as unknown as Cast;
  relayAction(cast)({ kind: "relay", agentId: "sender", to: { kind: "human" } });
  await vi.waitFor(() => expect(receptionist.nod).toHaveBeenCalledWith(150, 1));
  expect(envelope).toHaveBeenCalledWith(cast.stage, { x: 40, y: 50 }, cast.reception);
});
