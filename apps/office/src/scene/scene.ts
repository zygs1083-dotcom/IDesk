import { z } from "zod";

const point = z.object({ x: z.number(), y: z.number() });
const cover = z.object({
  x: z.number().positive(),
  y: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
});
const spot = point.extend({
  via: z.string(),
  facing: z.enum(["down", "left", "right", "up"]),
  covers: z.array(cover).optional(),
  mirror: z.literal(true).optional(),
});
const idleSpot = point.extend({
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
  via: z.string(),
  facing: spot.shape.facing,
});
export const sceneSchema = z.object({
  hostZones: z.record(z.string(), z.number().int().min(1).max(4)).optional(),
  title: z.string().optional(),
  door: point.extend({ via: z.string() }),
  frontDesk: z.object({ human: spot }),
  taskBoard: point.extend({ width: z.number(), height: z.number() }),
  zones: z.array(z.object({ name: point, seats: z.array(spot).length(4) })).length(4),
  meeting: z.object({ seats: z.array(spot).length(6) }),
  lounge: z.object({ spots: z.array(spot) }),
  standing: z.array(spot),
  spots: z.array(idleSpot),
  doneTray: point,
  bulletin: point,
  waypoints: z.array(point.extend({ id: z.string() })),
  edges: z.array(z.tuple([z.string(), z.string()])),
});

export type Scene = z.infer<typeof sceneSchema>;
export type Point = z.infer<typeof point>;
export type Seat = z.infer<typeof spot>;
export type Direction = Seat["facing"];

export type Spot = z.infer<typeof idleSpot>;
export type SpotId = Spot["id"];
