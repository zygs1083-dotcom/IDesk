import { reducedMotion } from "../engine/tween.ts";
import type { Translate } from "../i18n/translate.ts";
import type { Cast } from "./cast.ts";
import { startDozing } from "./idle-doze.ts";
import { idleMoves } from "./idle-moves.ts";
import {
  idleDelay,
  idleEligible,
  idleNeighbor,
  pickIdle,
  pickSmall,
  type Snapshot,
} from "./idle-pick.ts";

export function startIdle(cast: Cast, snapshot: Snapshot, t: Translate, random = Math.random) {
  const scheduled = new Set<string>();
  const reserved = new Set<string>();
  const moving = new Set<string>();
  const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const timers = new Map<ReturnType<typeof setTimeout>, () => void>();
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, ms);
      timers.set(timer, resolve);
    });
  const moves = idleMoves(cast, snapshot, t, wait, random);
  const wake = startDozing(cast, snapshot, reserved, t, random, (id) => schedule(id));
  cast.stage.world.on("office:active", wake);
  cast.stage.world.on("office:interrupt", moves.cancel);
  const perform = async (id: string) => {
    if (cast.stage.world.destroyed || !idleEligible(cast, snapshot, id)) return;
    const walking = [...cast.characters.values()].filter(
      (person) => person.state === "walk",
    ).length;
    let action = pickIdle(random, reducedMotion.matches, walking);
    if (
      (action === "chat" && (walking > 0 || moving.size > 0)) ||
      (action === "spot" && moving.size >= 2)
    )
      action = pickSmall(random, reducedMotion.matches);
    if (action === "chat") {
      const other = idleNeighbor(cast, snapshot, id);
      if (!other || reserved.has(other)) return;
      reserved.add(other);
      moving.add(id);
      moving.add(other);
      await moves.chat(id, other);
      reserved.delete(other);
      moving.delete(id);
      moving.delete(other);
    } else if (action === "spot") {
      moving.add(id);
      await moves.spot(id);
      moving.delete(id);
    } else await moves.small(id, action);
  };
  const schedule = (id: string) => {
    const previous = scheduledTimers.get(id);
    if (previous) {
      clearTimeout(previous);
      timers.delete(previous);
    }
    scheduledTimers.delete(id);
    if (cast.sleeping.has(id) || cast.stage.world.destroyed) return;
    const timer = setTimeout(() => {
      timers.delete(timer);
      scheduledTimers.delete(id);
      if (idleEligible(cast, snapshot, id) && !reserved.has(id)) {
        reserved.add(id);
        void cast.queue.enqueue(id, () => perform(id)).then(() => reserved.delete(id));
      }
      schedule(id);
    }, idleDelay(random));
    timers.set(timer, () => {});
    scheduledTimers.set(id, timer);
  };
  const sync = () => {
    for (const id of cast.present) {
      if (scheduled.has(id)) continue;
      scheduled.add(id);
      schedule(id);
    }
  };
  sync();
  cast.stage.world.on("destroyed", () => {
    cast.stage.world.off("office:active", wake);
    cast.stage.world.off("office:interrupt", moves.cancel);
    for (const [timer, resolve] of timers) {
      clearTimeout(timer);
      resolve();
    }
    timers.clear();
  });
  return sync;
}
