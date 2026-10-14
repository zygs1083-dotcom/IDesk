import { z } from "zod";

const point = z.object({ x: z.number(), y: z.number() });
const spot = point.extend({ via: z.string(), facing: z.enum(["down", "left", "right", "up"]) });
export const sceneSchema = z.object({
  hostZones: z.record(z.string(), z.number().int().min(1).max(4)).optional(),
  door: point.extend({ via: z.string() }),
  frontDesk: z.object({ human: spot }),
  taskBoard: point.extend({ width: z.number(), height: z.number() }),
  zones: z.array(z.object({ name: point, seats: z.array(spot).length(4) })).length(4),
  meeting: z.object({ seats: z.array(spot).length(6) }),
  lounge: z.object({ spots: z.array(spot) }),
  doneTray: point,
  waypoints: z.array(point.extend({ id: z.string() })),
  edges: z.array(z.tuple([z.string(), z.string()])),
});

export type Scene = z.infer<typeof sceneSchema>;
export type Point = z.infer<typeof point>;
export type Seat = z.infer<typeof spot>;
export type Direction = Seat["facing"];
