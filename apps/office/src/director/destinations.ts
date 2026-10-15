import { coffeeSeats, type Seat, workSpot } from "../world/places.ts";
import type { Stage } from "../world/stage.ts";

export function destinations(stage: Stage) {
  const { layout } = stage;
  return {
    board: layout.points.board,
    counter: layout.reception.counter,
    meeting: layout.meeting.seats.map((id) => layout.seats.find((seat) => seat.id === id) as Seat),
    meetingDesk: workSpot(layout.meeting.workSpot, layout.meeting.workSpot.y, layout),
    coffee: coffeeSeats(layout),
    doneTray: layout.drops.doneTray,
    bulletin: layout.drops.bulletin,
  };
}
