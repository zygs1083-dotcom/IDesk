import type { Translate } from "../i18n/translate.ts";
import type { Key } from "../i18n/zh.ts";
import { chatSeats } from "../world/places.ts";
import type { Cast } from "./cast.ts";
import { idleEligible, idleSpeed, type Snapshot } from "./idle-pick.ts";
import { idleSpots } from "./idle-spots.ts";

const BUBBLE_MS = 3000;
const LOOK_MS = 800;
const CHAT_MIN_MS = 1000;
const CHAT_RANGE_MS = 1000;

const stretchKeys: Key[] = [
  "idle.anyTasks",
  "idle.cheer",
  "idle.coffee",
  "idle.slacking",
  "idle.waiting",
];
const chatKeys: Key[] = ["idle.chat.dots", "idle.chat.laugh", "idle.chat.nod"];
export function stretch(t: Translate, random: () => number) {
  const key = stretchKeys[Math.floor(random() * stretchKeys.length)] as Key;
  return t(key);
}

export type Wait = (ms: number) => Promise<void>;

export function idleMoves(
  cast: Cast,
  snapshot: Snapshot,
  t: Translate,
  wait: Wait,
  random: () => number,
) {
  const chats = new Map<string, () => void>();
  const alive = () => !cast.stage.world.destroyed;
  const home = async (id: string) => {
    const seat = cast.seats.get(id);
    if (!seat || !alive()) return;
    await cast.walk(id, seat, idleSpeed(random));
    if (alive()) cast.settle(id, "sit");
  };
  const small = async (id: string, action: "stretch" | "look" | "nod") => {
    const character = cast.characters.get(id);
    const seat = cast.seats.get(id);
    if (!character || !seat) return;
    if (action === "stretch") {
      character.bubble.show(stretch(t, random), BUBBLE_MS);
    } else if (action === "nod") await character.nod();
    else {
      character.facing = "left";
      await wait(LOOK_MS);
      if (!alive()) return;
      character.facing = "right";
      await wait(LOOK_MS);
      if (alive()) character.facing = seat.facing;
    }
  };
  const spots = idleSpots(cast, t, wait, random, (id) => small(id, "stretch"), home);
  return {
    small,
    spot: spots.visit,
    cancel(id: string) {
      spots.cancel(id);
      chats.get(id)?.();
    },
    async chat(id: string, other: string) {
      let cancelled = false;
      let interrupt = () => {};
      const interrupted = new Promise<void>((resolve) => {
        interrupt = resolve;
      });
      const cancel = () => {
        cancelled = true;
        cast.characters.get(id)?.stopWalking();
        cast.characters.get(other)?.stopWalking();
        interrupt();
      };
      chats.set(id, cancel);
      chats.set(other, cancel);
      let ready: (eligible: boolean) => void = () => {};
      let release: () => void = () => {};
      const started = new Promise<boolean>((resolve) => {
        ready = resolve;
      });
      const finished = new Promise<void>((resolve) => {
        release = resolve;
      });
      const partner = cast.queue.enqueue(other, async () => {
        ready(idleEligible(cast, snapshot, other));
        await finished;
      });
      const eligible = await started;
      const a = cast.seats.get(id);
      const b = cast.seats.get(other);
      if (eligible && idleEligible(cast, snapshot, id) && a && b && alive()) {
        const occupied = [...cast.characters]
          .filter(
            ([person, character]) =>
              person !== id && person !== other && character.state !== "away",
          )
          .map(([, character]) => character);
        const targets =
          chatSeats(a, cast.stage.layout, occupied) ?? chatSeats(b, cast.stage.layout, occupied);
        if (targets) {
          cast.characters.get(id)?.setState("walk");
          cast.characters.get(other)?.setState("walk");
          await Promise.all([
            cast.walk(id, targets[0], idleSpeed(random)),
            cast.walk(other, targets[1], idleSpeed(random)),
          ]);
          const rounds = 3 + Math.floor(random() * 2);
          for (let round = 0; round < rounds && alive() && !cancelled; round++) {
            const key = chatKeys[round % chatKeys.length];
            const duration = CHAT_MIN_MS + random() * CHAT_RANGE_MS;
            if (key) cast.characters.get(round % 2 ? other : id)?.bubble.show(t(key), duration);
            await Promise.race([wait(duration), interrupted]);
          }
          if (!cancelled) await Promise.all([home(id), home(other)]);
        }
      }
      chats.delete(id);
      chats.delete(other);
      release();
      await partner;
    },
  };
}
