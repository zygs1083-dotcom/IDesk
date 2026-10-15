import type { Translate } from "../i18n/translate.ts";
import type { Key } from "../i18n/zh.ts";
import { cellCenter } from "../world/path.ts";
import { chatSeats } from "../world/places.ts";
import type { SpotId } from "../world/seats.ts";
import type { Cast } from "./cast.ts";
import { idleEligible, idleSpeed, idleStay, pickSpots, type Snapshot } from "./idle-pick.ts";

const BUBBLE_MS = 3000;
const LOOK_MS = 800;
const CHAT_MIN_MS = 1000;
const CHAT_RANGE_MS = 1000;

const spotKeys: Record<SpotId, Key> = {
  bookshelf: "idle.spot.bookshelf",
  coffee: "idle.spot.coffee",
  meetingDoor: "idle.spot.meetingDoor",
  plant: "idle.spot.plant",
  printer: "idle.spot.printer",
  sofa: "idle.spot.sofa",
  whiteboard: "idle.spot.whiteboard",
  window: "idle.spot.window",
};
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
  const alive = () => !cast.stage.world.destroyed;
  const home = async (id: string) => {
    const seat = cast.seats.get(id);
    if (!seat || !alive()) return;
    await cast.walk(id, seat, idleSpeed(random));
    if (alive()) cast.settle(id, "sit");
  };
  return {
    async small(id: string, action: "stretch" | "look" | "nod") {
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
    },
    async spot(id: string) {
      for (const spot of pickSpots(cast.stage.layout.spots, random)) {
        await cast.walk(id, cellCenter(spot), idleSpeed(random));
        if (!alive()) return;
        const duration = idleStay(random);
        cast.characters.get(id)?.bubble.show(t(spotKeys[spot.id]), duration);
        await wait(duration);
        if (!alive()) return;
      }
      await home(id);
    },
    async chat(id: string, other: string) {
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
        const targets = chatSeats(a, cast.stage.layout, cast.stage.catalog);
        if (targets) {
          await Promise.all([
            cast.walk(id, targets[0], idleSpeed(random)),
            cast.walk(other, targets[1], idleSpeed(random)),
          ]);
          const rounds = 3 + Math.floor(random() * 2);
          for (let round = 0; round < rounds && alive(); round++) {
            const key = chatKeys[round % chatKeys.length];
            const duration = CHAT_MIN_MS + random() * CHAT_RANGE_MS;
            if (key) cast.characters.get(round % 2 ? other : id)?.bubble.show(t(key), duration);
            await wait(duration);
          }
          await Promise.all([home(id), home(other)]);
        }
      }
      release();
      await partner;
    },
  };
}
