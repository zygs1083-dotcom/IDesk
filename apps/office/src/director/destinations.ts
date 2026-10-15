import { cellCenter } from "../world/path.ts";
import { coffeeSeats, spriteCenter, workSpot } from "../world/places.ts";
import { seats, type Target } from "../world/seats.ts";
import type { Stage } from "../world/stage.ts";

export function destinations(stage: Stage) {
  const { layout, catalog, assets } = stage;
  const available = seats(layout, catalog);
  const center = (id: string) => spriteCenter(id, layout, catalog, assets.textures);
  const itemCenter = (item: string) => {
    const point = item === "file-tray" ? layout.points.doneTray : layout.points.bulletin;
    if (!point) throw new Error(`Missing point: ${item}`);
    const object = layout.objects
      .filter((object) => object.item === item)
      .sort(
        (a, b) =>
          Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y),
      )[0];
    if (!object) throw new Error(`Missing object: ${item}`);
    return center(object.id);
  };
  return {
    board: cellCenter(layout.points.board as Target),
    counter: center(layout.reception.counter),
    meeting: layout.meeting.chairs.map((id) => available.find((seat) => seat.id === id) as Target),
    meetingDesk: workSpot(layout.meeting.table, layout, catalog),
    coffee: coffeeSeats(layout, catalog),
    doneTray: itemCenter("file-tray"),
    bulletin: itemCenter("bulletin"),
  };
}
