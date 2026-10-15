import type { CharacterState } from "../stage/character.ts";
import type { Point } from "../world/path.ts";
import type { Spot } from "../world/seats.ts";
import type { Task } from "./events.ts";

const IDLE_MIN_MS = 10_000;
const IDLE_RANGE_MS = 30_000;
const STAY_MIN_MS = 2000;
const STAY_RANGE_MS = 4000;
const SPEED_MIN = 120;
const SPEED_RANGE = 50;
const SMALL_CHANCE = 0.5;
const SPOT_CUTOFF = 0.8;
const SECOND_SPOT_CHANCE = 0.25;
const DOZE_AFTER_MS = 180_000;
const SLEEP_MIN_MS = 60_000;
const SLEEP_RANGE_MS = 120_000;

type IdleCharacter = Point & { state: CharacterState };
type IdleCast = {
  present: ReadonlySet<string>;
  sleeping: ReadonlySet<string>;
  characters: ReadonlyMap<string, IdleCharacter>;
};
export type Snapshot = ReadonlyMap<string, Pick<Task, "status" | "assigneeId">>;
export function idleEligible(cast: IdleCast, snapshot: Snapshot, id: string, ignoreSleep = false) {
  const character = cast.characters.get(id);
  return (
    (ignoreSleep || !cast.sleeping.has(id)) &&
    cast.present.has(id) &&
    (character?.state === "idle" || character?.state === "sit") &&
    ![...snapshot.values()].some((task) => task.assigneeId === id && task.status === "in_progress")
  );
}

export function idleNeighbor(cast: IdleCast, snapshot: Snapshot, id: string) {
  const character = cast.characters.get(id);
  if (!character) return;
  return [...cast.characters]
    .filter(([other]) => other !== id && idleEligible(cast, snapshot, other))
    .sort(
      ([, a], [, b]) =>
        Math.hypot(a.x - character.x, a.y - character.y) -
        Math.hypot(b.x - character.x, b.y - character.y),
    )[0]?.[0];
}

export function pickSmall(random: () => number, reduced: boolean) {
  const choices = reduced ? (["stretch", "nod"] as const) : (["stretch", "look", "nod"] as const);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))] as
    | "stretch"
    | "nod"
    | "look";
}

export function pickIdle(
  random: () => number,
  reduced: boolean,
  walking = 0,
): "stretch" | "look" | "nod" | "spot" | "chat" {
  if (reduced) return pickSmall(random, true);
  const value = random();
  if (value < SMALL_CHANCE || walking >= 2) return pickSmall(random, false);
  return value < SPOT_CUTOFF ? "spot" : "chat";
}

export const idleDelay = (random: () => number) => IDLE_MIN_MS + random() * IDLE_RANGE_MS;
export const idleStay = (random: () => number) => STAY_MIN_MS + random() * STAY_RANGE_MS;
export const idleSpeed = (random: () => number) => SPEED_MIN + random() * SPEED_RANGE;

export function pickSpots(spots: Spot[], random: () => number) {
  const first = spots[Math.floor(random() * spots.length)];
  if (!first) return [];
  const others = spots.filter((spot) => spot.id !== first.id);
  const second =
    random() < SECOND_SPOT_CHANCE ? others[Math.floor(random() * others.length)] : undefined;
  return second ? [first, second] : [first];
}

export function idleDozing(
  cast: IdleCast,
  snapshot: Snapshot,
  id: string,
  last: number,
  now: number,
) {
  return idleEligible(cast, snapshot, id) && now - last >= DOZE_AFTER_MS;
}

export const idleSleepDuration = (random: () => number) => SLEEP_MIN_MS + random() * SLEEP_RANGE_MS;
export const idleSleepCapacity = (eligible: number) => Math.floor(eligible / 3);
