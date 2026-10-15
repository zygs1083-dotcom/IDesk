import { z } from "zod";

export const TILE = 32;
export const facingSchema = z.enum(["down", "up", "left", "right"]);
const point = z.object({ x: z.number(), y: z.number() });
export const catalogSchema = z.object({
  tile: z.literal(32),
  items: z.record(
    z.string(),
    z.object({
      footprint: z.object({ w: z.number().int().positive(), h: z.number().int().positive() }),
      blocks: z.boolean(),
      layer: z.enum(["object", "wall"]).default("object"),
      parts: z
        .array(
          z.object({
            frame: z.string(),
            dx: z.number(),
            dy: z.number(),
            sortY: z.number(),
            bias: z.union([z.literal(0), z.literal(1)]),
          }),
        )
        .min(1),
      seat: point.extend({ facing: facingSchema }).optional(),
      workSpot: point.optional(),
      textArea: point.extend({ w: z.number().positive(), h: z.number().positive() }).optional(),
    }),
  ),
});
export type Catalog = z.infer<typeof catalogSchema>;
export type Furniture = Catalog["items"][string];

const coordinate = z.number().int().nonnegative();
const layoutPoint = z.object({ x: coordinate, y: coordinate, facing: facingSchema });
export const layoutSchema = z.object({
  title: z.string().optional(),
  reception: z.object({ chair: z.string(), counter: z.string() }),
  meeting: z.object({ table: z.string(), chairs: z.array(z.string()).length(6) }),
  lounge: z.array(z.string()),
  standing: z.array(layoutPoint),
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
  points: z.record(z.string(), layoutPoint),
  spots: z.array(
    layoutPoint.extend({
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
  hostZones: z.record(z.string(), z.string()),
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
      for (const id of [
        layout.reception.chair,
        layout.reception.counter,
        layout.meeting.table,
        ...layout.meeting.chairs,
        ...layout.lounge,
      ])
        if (!ids.has(id)) issue(`Unknown place object: ${id}`);
      const zones = new Set(layout.zones.map((zone) => zone.id));
      for (const zone of Object.values(layout.hostZones))
        if (!zones.has(zone)) issue(`Unknown host zone: ${zone}`);
      for (const zone of layout.zones) {
        for (const id of [...zone.desks, ...zone.chairs, zone.plaque])
          if (!ids.has(id)) issue(`Unknown zone object: ${id}`);
      }
    })
    .parse(value);
}
