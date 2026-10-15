import type { Translate } from "../i18n/translate.ts";
import type { Cast } from "./cast.ts";
import { stretch } from "./idle-moves.ts";
import {
  idleDozing,
  idleEligible,
  idleSleepCapacity,
  idleSleepDuration,
  type Snapshot,
} from "./idle-pick.ts";

const CHECK_MS = 10_000;
const NOD_MS = 4000;

export function startDozing(
  cast: Cast,
  snapshot: Snapshot,
  reserved: ReadonlySet<string>,
  t: Translate,
  random: () => number,
  resume: (id: string) => void,
) {
  const timers = new Map<
    string,
    { nod: ReturnType<typeof setInterval>; wake: ReturnType<typeof setTimeout> }
  >();
  cast.wake = (id) => {
    const sleeping = timers.get(id);
    if (!sleeping) return;
    clearInterval(sleeping.nod);
    clearTimeout(sleeping.wake);
    timers.delete(id);
    cast.sleeping.delete(id);
    cast.characters.get(id)?.stopNod();
    cast.characters.get(id)?.bubble.hide();
    resume(id);
  };
  const check = setInterval(() => {
    const awakeCast = { ...cast, sleeping: new Set<string>() };
    const eligible = [...cast.present].filter((id) => idleEligible(awakeCast, snapshot, id));
    const capacity = idleSleepCapacity(eligible.length);
    for (const id of [...cast.sleeping].slice(capacity)) cast.active(id);
    for (const id of eligible) {
      if (cast.sleeping.size >= capacity) break;
      const last = cast.lastActive.get(id);
      if (
        last === undefined ||
        reserved.has(id) ||
        !idleDozing(cast, snapshot, id, last, Date.now())
      )
        continue;
      cast.sleeping.add(id);
      cast.characters.get(id)?.bubble.show("zZ", Number.POSITIVE_INFINITY);
      timers.set(id, {
        nod: setInterval(() => {
          void cast.characters.get(id)?.nod(300, 1);
        }, NOD_MS),
        wake: setTimeout(() => {
          cast.active(id);
          cast.characters.get(id)?.bubble.show(stretch(t, random), 3000);
        }, idleSleepDuration(random)),
      });
    }
  }, CHECK_MS);
  cast.stage.world.on("destroyed", () => {
    clearInterval(check);
    for (const timer of timers.values()) {
      clearInterval(timer.nod);
      clearTimeout(timer.wake);
    }
    timers.clear();
    cast.sleeping.clear();
  });
}
