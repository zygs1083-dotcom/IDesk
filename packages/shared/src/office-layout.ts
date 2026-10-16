import { z } from "zod";

const coordinate = z.number().nonnegative();
const point = z.object({ x: coordinate, y: coordinate });
const rectangle = point.extend({ w: z.number().positive(), h: z.number().positive() });
export const officeFacingSchema = z.enum(["front", "back", "down", "left", "right"]);
const position = point.extend({ facing: officeFacingSchema });
const id = z.string().min(1);
export const officeLayoutSchema = z.object({
  title: z.string().optional(),
  size: z.object({ w: z.literal(1672), h: z.literal(941) }),
  occluders: z.array(
    z.object({
      id,
      polygon: z.array(z.tuple([coordinate, coordinate])).min(3),
      baseline: coordinate,
      floorTop: coordinate,
      floorBottom: coordinate.optional(),
    }),
  ),
  grid: z.object({
    cell: z.literal(16),
    clearance: z.number().positive().multipleOf(16),
    rows: z.array(z.string().regex(/^[.#]+$/)),
  }),
  seats: z.array(
    position.extend({
      id,
      mirror: z.boolean().optional(),
      zone: id.optional(),
      workSpot: point,
    }),
  ),
  zones: z.array(z.object({ id, seats: z.array(id), plaque: rectangle })),
  board: rectangle,
  points: z.object({ door: position, doneTray: position, bulletin: position, board: position }),
  drops: z.object({ doneTray: point, bulletin: point }),
  spots: z
    .array(
      position.extend({
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
    )
    .length(8),
  standing: z.array(position),
  reception: z.object({ seat: id, counter: point }),
  meeting: z.object({ seats: z.array(id), workSpot: point }),
  lounge: z.array(id),
  hostZones: z.record(id, id),
});
export type OfficeLayout = z.infer<typeof officeLayoutSchema>;

export function parseOfficeLayout(value: unknown): OfficeLayout {
  return officeLayoutSchema
    .superRefine((layout, ctx) => {
      const issue = (message: string) => ctx.addIssue({ code: "custom", message });
      const inside = ({ x, y }: { x: number; y: number }) => x < layout.size.w && y < layout.size.h;
      const checkPoint = (p: { x: number; y: number }, label: string) => {
        if (!inside(p)) issue(`Outside background: ${label}`);
      };
      const checkRect = (r: z.infer<typeof rectangle>, label: string) => {
        if (r.x + r.w > layout.size.w || r.y + r.h > layout.size.h)
          issue(`Outside background: ${label}`);
      };
      const columns = Math.ceil(layout.size.w / layout.grid.cell);
      if (
        layout.grid.rows.length !== Math.ceil(layout.size.h / layout.grid.cell) ||
        layout.grid.rows.some((row) => row.length !== columns)
      )
        issue("Grid dimensions do not match size");
      const allIds = [...layout.occluders, ...layout.seats, ...layout.zones, ...layout.spots].map(
        (item) => item.id,
      );
      if (new Set(allIds).size !== allIds.length) issue("Duplicate id");
      const seats = new Map(layout.seats.map((seat) => [seat.id, seat]));
      const zones = new Map(layout.zones.map((zone) => [zone.id, zone]));
      for (const occluder of layout.occluders) {
        for (const [x, y] of occluder.polygon) checkPoint({ x, y }, occluder.id);
        const bottom = occluder.floorBottom ?? occluder.baseline;
        if (occluder.floorTop > bottom || bottom < occluder.baseline || bottom > layout.size.h)
          issue(`Invalid floor footprint: ${occluder.id}`);
        const ys = occluder.polygon.map((p) => p[1]);
        if (occluder.baseline < Math.min(...ys) || occluder.baseline > layout.size.h)
          issue(`Invalid baseline: ${occluder.id}`);
      }
      const references = [
        layout.reception.seat,
        ...layout.meeting.seats,
        ...layout.lounge,
        ...layout.zones.flatMap((zone) => zone.seats),
      ];
      for (const reference of references)
        if (!seats.has(reference)) issue(`Unknown seat: ${reference}`);
      const memberships = layout.zones.flatMap((zone) => zone.seats);
      if (new Set(memberships).size !== memberships.length) issue("Seat repeated in zones");
      for (const seat of layout.seats) {
        const memberships = layout.zones.filter((zone) => zone.seats.includes(seat.id));
        if (
          seat.zone
            ? memberships.length !== 1 || memberships[0]?.id !== seat.zone
            : memberships.length !== 0
        )
          issue(`Inconsistent seat zone: ${seat.id}`);
        checkPoint(seat.workSpot, `${seat.id} workSpot`);
      }
      for (const zone of layout.zones) checkRect(zone.plaque, zone.id);
      checkRect(layout.board, "board");
      for (const zone of Object.values(layout.hostZones))
        if (!zones.has(zone)) issue(`Unknown host zone: ${zone}`);
      checkPoint(layout.reception.counter, "counter");
      checkPoint(layout.meeting.workSpot, "meeting workSpot");
      for (const [label, drop] of Object.entries(layout.drops)) checkPoint(drop, `${label} drop`);
      for (const p of [
        ...layout.seats,
        ...Object.values(layout.points),
        ...layout.spots,
        ...layout.standing,
      ]) {
        checkPoint(p, "position");
        if (layout.grid.rows[Math.floor(p.y / 16)]?.[Math.floor(p.x / 16)] !== ".")
          issue("Position is not walkable");
      }
    })
    .parse(value);
}
