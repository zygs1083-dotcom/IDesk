import type { Scene, Seat } from "../scene/scene.ts";
import type { Cards } from "../stage/card.ts";
import type { Cast } from "./cast.ts";
import type { Task } from "./events.ts";

export function placeSnapshot(cast: Cast, cards: Cards, tasks: Task[]) {
  const { scene } = cast;
  for (const task of tasks) {
    if (task.status === "open" || task.status === "recruiting") cards.pin(task);
    if (task.status === "in_progress" && task.recruit) {
      task.recruit.joined.forEach((id, index) => {
        const seat = scene.meeting.seats[index];
        if (seat && cast.present.has(id)) cast.place(id, seat, "talk");
      });
      const center = {
        x: scene.meeting.seats.reduce((sum, seat) => sum + seat.x, 0) / scene.meeting.seats.length,
        y: scene.meeting.seats.reduce((sum, seat) => sum + seat.y, 0) / scene.meeting.seats.length,
      };
      cards.place(task, center);
    } else if (
      task.assigneeId &&
      (task.status === "in_progress" || task.status === "paused" || task.status === "assigned")
    ) {
      const id = task.assigneeId;
      const seat =
        task.status === "paused"
          ? coffeeSeat(scene, [...cast.present].indexOf(id))
          : cast.seats.get(id);
      if (seat && cast.present.has(id))
        cast.place(
          id,
          seat,
          task.status === "paused" ? "coffee" : task.status === "in_progress" ? "typing" : "sit",
        );
      cards.place(task, cast.desk(id));
    }
  }
}

export function coffeeSeat(scene: Scene, index: number): Seat | undefined {
  return scene.lounge.spots[index % scene.lounge.spots.length];
}
