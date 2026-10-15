import { z } from "zod";
import { type Catalog, facingSchema } from "./catalog.ts";

const coordinate = z.number().int().nonnegative();
const point = z.object({ x: coordinate, y: coordinate, facing: facingSchema });
export const layoutSchema = z.object({
  size: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }),
  ground: z.array(z.string()),
  objects: z.array(z.object({ id: z.string(), item: z.string(), x: coordinate, y: coordinate })),
  zones: z.array(
    z.object({
      id: z.string(),
      desks: z.array(z.string()),
      chairs: z.array(z.string()),
      plaque: z.string(),
    }),
  ),
  points: z.record(z.string(), point),
  spots: z.array(
    point.extend({
      id: z.enum([
        "printer",
        "bookshelf",
        "whiteboard",
        "window",
        "plant",
        "sofa",
        "coffee",
        "meetingDoor",
      ]),
    }),
  ),
  hostZones: z.record(z.string(), z.number().int().nonnegative()),
});
export type Layout = z.infer<typeof layoutSchema>;

export function parseLayout(value: unknown, catalog: Catalog): Layout {
  return layoutSchema
    .superRefine((layout, ctx) => {
      const issue = (message: string) => ctx.addIssue({ code: "custom", message });
      if (
        layout.ground.length !== layout.size.h ||
        layout.ground.some((row) => row.length !== layout.size.w)
      )
        issue("Ground dimensions do not match size");
      const ids = new Set(layout.objects.map((object) => object.id));
      if (ids.size !== layout.objects.length) issue("Duplicate object id");
      for (const object of layout.objects) {
        const item = catalog.items[object.item];
        if (!item) issue(`Unknown item: ${object.item}`);
        else if (
          object.x + item.footprint.w > layout.size.w ||
          object.y + item.footprint.h > layout.size.h
        )
          issue(`Object outside map: ${object.id}`);
      }
      for (const zone of layout.zones) {
        for (const id of [...zone.desks, ...zone.chairs, zone.plaque])
          if (!ids.has(id)) issue(`Unknown zone object: ${id}`);
      }
    })
    .parse(value);
}

export async function loadLayout(catalog: Catalog): Promise<Layout> {
  const response = await fetch("/office/layout.json", { cache: "no-store" });
  return parseLayout(await response.json(), catalog);
}
