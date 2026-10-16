import type { Translate } from "../i18n/translate.ts";
import type { Key } from "../i18n/zh.ts";
import type { SpotId } from "../world/places.ts";
import { bodiesIntersect, stopAllowed } from "../world/stops.ts";
import type { Cast } from "./cast.ts";
import { idleSpeed, idleStay, pickSpots } from "./idle-pick.ts";

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

export function idleSpots(
  cast: Cast,
  t: Translate,
  wait: (ms: number) => Promise<void>,
  random: () => number,
  small: (id: string) => Promise<void>,
  home: (id: string) => Promise<void>,
) {
  const approaching = new Map<SpotId, string>();
  const occupied = new Map<SpotId, string>();
  const visits = new Map<string, () => void>();
  const release = (id: string) => {
    for (const claims of [approaching, occupied])
      for (const [spot, owner] of claims) if (owner === id) claims.delete(spot);
  };
  return {
    cancel(id: string) {
      const cancel = visits.get(id);
      if (!cancel) return;
      cancel();
      cast.characters.get(id)?.stopWalking();
      visits.delete(id);
      release(id);
    },
    async visit(id: string) {
      let token = () => {};
      const interrupted = new Promise<void>((resolve) => {
        token = resolve;
      });
      visits.set(id, token);
      const current = () => !cast.stage.world.destroyed && visits.get(id) === token;
      const available = () =>
        cast.stage.layout.spots.filter(
          (spot) =>
            !approaching.has(spot.id) &&
            !occupied.has(spot.id) &&
            stopAllowed(spot, cast.stage.layout) &&
            [...cast.characters].every(
              ([other, person]) =>
                other === id ||
                person.state === "away" ||
                person.state === "walk" ||
                !bodiesIntersect(spot, person, cast.stage.layout.grid.silhouette),
            ),
        );
      const selected = pickSpots(available(), random);
      if (!selected.length) {
        visits.delete(id);
        await small(id);
        return;
      }
      for (const desired of selected) {
        const spot = available().find((spot) => spot.id === desired.id) ?? available()[0];
        if (!spot) break;
        approaching.set(spot.id, id);
        await cast.walk(id, spot, idleSpeed(random));
        if (!current()) {
          release(id);
          return;
        }
        approaching.delete(spot.id);
        occupied.set(spot.id, id);
        const duration = idleStay(random);
        cast.characters.get(id)?.bubble.show(t(spotKeys[spot.id]), duration);
        await Promise.race([wait(duration), interrupted]);
        release(id);
        if (!current()) return;
      }
      visits.delete(id);
      await home(id);
    },
  };
}
