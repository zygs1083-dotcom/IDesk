import type { Point } from "../world/path.ts";
import type { Target } from "../world/places.ts";
import { bodiesIntersect, nearestStop, stopAllowed } from "../world/stops.ts";
import type { Cast } from "./cast.ts";

export function reserveWalk(cast: Cast, id: string, target: Target) {
  const layout = cast.stage.layout;
  const occupied = () => [
    ...[...cast.characters]
      .filter(
        ([other, person]) => other !== id && person.state !== "walk" && person.state !== "away",
      )
      .map(([, person]) => person),
    ...[...cast.stopping].filter(([other]) => other !== id).map(([, point]) => point),
  ];
  const clear = (point: Point) =>
    occupied().every((person) => !bodiesIntersect(point, person, layout.grid.silhouette));
  const seat = layout.seats.find((seat) => seat.x === target.x && seat.y === target.y);
  const finish = seat && clear(target) ? target : nearestStop(target, occupied(), layout);
  if (!finish) return;
  cast.stopping.set(id, finish);
  return {
    target: finish,
    canStop: (point: Point) =>
      clear(point) &&
      ((seat && point.x === finish.x && point.y === finish.y) || stopAllowed(point, layout)),
    release: () => cast.stopping.delete(id),
  };
}
