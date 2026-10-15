import { type Catalog, type Furniture, TILE } from "./catalog.ts";
import type { Layout } from "./layout.ts";

export function seats(layout: Layout, catalog: Catalog) {
  return layout.objects.flatMap((object) => {
    const seat = (catalog.items[object.item] as Furniture).seat;
    return seat
      ? [
          {
            id: object.id,
            x: object.x * TILE + seat.x,
            y: object.y * TILE + seat.y,
            facing: seat.facing,
            zone: layout.zones.find((zone) => zone.chairs.includes(object.id))?.id,
          },
        ]
      : [];
  });
}
