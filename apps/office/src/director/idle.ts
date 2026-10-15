import { reducedMotion } from "../engine/tween.ts";
import type { Point, Seat } from "../scene/scene.ts";
import type { CharacterState } from "../stage/character.ts";
import type { Cast } from "./cast.ts";
import type { Task } from "./events.ts";

type IdleCharacter = Point & { state: CharacterState };
type IdleCast = {
  present: ReadonlySet<string>;
  characters: ReadonlyMap<string, IdleCharacter>;
};
type Snapshot = ReadonlyMap<string, Pick<Task, "status" | "assigneeId">>;
const BUBBLE_MS = 3000;
const LOOK_MS = 800;
const COFFEE_MS = 5000;
const BOARD_MS = 3000;
// 看板前的站位：任务板底边再往下一个身位
const BOARD_STAND_OFFSET = 115;

export function idleEligible(cast: IdleCast, snapshot: Snapshot, id: string) {
  const character = cast.characters.get(id);
  return (
    id !== "human" &&
    cast.present.has(id) &&
    (character?.state === "idle" || character?.state === "sit") &&
    ![...snapshot.values()].some((task) => task.assigneeId === id && task.status === "in_progress")
  );
}

export function pickIdle(random: () => number, reduce: boolean) {
  if (reduce) return "stretch";
  const value = random();
  if (value < 0.2) return "stretch";
  if (value < 0.4) return "look";
  if (value < 0.6) return "coffee";
  if (value < 0.8) return "chat";
  return "board";
}

export function idleDelay(random: () => number) {
  return 20_000 + random() * 40_000;
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

export function idleCoffee(spots: Seat[], characters: Iterable<IdleCharacter>) {
  const occupied = [...characters].filter((character) => character.state === "coffee");
  return spots.find(
    (spot) => !occupied.some((person) => person.x === spot.x && person.y === spot.y),
  );
}

export function startIdle(cast: Cast, snapshot: Snapshot, lines: string[], random = Math.random) {
  const { stage, scene } = cast;
  const scheduled = new Set<string>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const coffee = new Set<Seat>();
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, ms);
      timers.add(timer);
    });
  const perform = async (id: string) => {
    if (stage.world.destroyed || !idleEligible(cast, snapshot, id)) return;
    const character = cast.characters.get(id);
    const seat = cast.seats.get(id);
    if (!character || !seat) return;
    const action = pickIdle(random, reducedMotion.matches);
    if (action === "stretch") {
      const line = lines[Math.floor(random() * lines.length)];
      if (line) character.bubble.show(line, BUBBLE_MS);
    } else if (action === "look") {
      character.facing = "left";
      await wait(LOOK_MS);
      if (stage.world.destroyed) return;
      character.facing = "right";
      await wait(LOOK_MS);
      if (!stage.world.destroyed) character.facing = seat.facing;
    } else if (action === "chat") {
      const neighbor = idleNeighbor(cast, snapshot, id);
      if (!neighbor) return;
      character.bubble.show("…", BUBBLE_MS);
      cast.characters.get(neighbor)?.bubble.show("…", BUBBLE_MS);
    } else {
      const board = {
        x: scene.taskBoard.x + scene.taskBoard.width / 2,
        y: scene.taskBoard.y + scene.taskBoard.height + BOARD_STAND_OFFSET,
      };
      const via = cast.nearest(board);
      const target =
        action === "coffee"
          ? idleCoffee(
              scene.lounge.spots.filter((spot) => !coffee.has(spot)),
              cast.characters.values(),
            )
          : via && { ...board, via: via.id, facing: "up" as const };
      if (!target) return;
      if (action === "coffee") coffee.add(target);
      await cast.walk(id, target);
      if (stage.world.destroyed) return;
      if (action === "coffee") character.setState("coffee");
      await wait(action === "coffee" ? COFFEE_MS : BOARD_MS);
      if (stage.world.destroyed) return;
      coffee.delete(target);
      await cast.walk(id, seat);
      if (!stage.world.destroyed) cast.settle(id, "sit");
    }
  };
  const schedule = (id: string) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (idleEligible(cast, snapshot, id)) void cast.queue.enqueue(id, () => perform(id));
      schedule(id);
    }, idleDelay(random));
    timers.add(timer);
  };
  const sync = () => {
    for (const id of cast.present) {
      if (scheduled.has(id)) continue;
      scheduled.add(id);
      schedule(id);
    }
  };
  sync();
  stage.world.on("destroyed", () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  });
  return sync;
}
