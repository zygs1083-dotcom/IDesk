import type { Cards } from "../stage/card.ts";
import type { Cast } from "./cast.ts";
import { destinations } from "./destinations.ts";
import type { Task } from "./events.ts";

export function placeSnapshot(cast: Cast, cards: Cards, tasks: Task[]) {
  const places = destinations(cast.stage);
  for (const task of tasks) {
    if (task.status === "open" || task.status === "recruiting") cards.pin(task);
    if (task.status === "in_progress" && task.recruit) {
      task.recruit.joined.forEach((id, index) => {
        const seat = places.meeting[index];
        if (seat && cast.present.has(id)) cast.place(id, seat, "talk");
      });
      cards.place(task, places.meetingDesk);
    } else if (
      task.assigneeId &&
      (task.status === "in_progress" || task.status === "paused" || task.status === "assigned")
    ) {
      const id = task.assigneeId;
      const seat =
        task.status === "paused"
          ? places.coffee[[...cast.present].indexOf(id) % places.coffee.length]
          : cast.seats.get(id);
      if (seat && cast.present.has(id))
        cast.place(
          id,
          seat,
          task.status === "paused" ? "coffee" : task.status === "in_progress" ? "typing" : "sit",
        );
      const desk = cast.desk(id);
      const character = cast.characters.get(id);
      if (desk && task.status !== "paused") cards.place(task, desk);
      else if (character) cards.carry(task, character);
    }
  }
}
