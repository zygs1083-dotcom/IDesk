import type { Cast } from "./cast.ts";

export async function returnToSeat(cast: Cast, id: string) {
  const character = cast.characters.get(id);
  const seat = cast.seats.get(id);
  if (
    !character ||
    !seat ||
    !("workSpot" in seat) ||
    !cast.present.has(id) ||
    cast.stage.world.destroyed ||
    character.state === "talk" ||
    character.state === "coffee"
  )
    return;
  const state = character.state === "typing" ? "typing" : "sit";
  if (character.x !== seat.x || character.y !== seat.y) await cast.walk(id, seat);
  if (!cast.stage.world.destroyed) cast.settle(id, state);
}
