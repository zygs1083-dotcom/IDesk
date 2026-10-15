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
            bias: z.number(),
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

export async function loadCatalog(): Promise<Catalog> {
  const response = await fetch("/office/catalog.json", { cache: "no-store" });
  return catalogSchema.parse(await response.json());
}
