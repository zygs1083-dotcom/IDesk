import { expect, test } from "vitest";
import rawCatalog from "../../public/catalog.json";
import rawLayout from "../../public/layout.json";
import { catalogSchema, type Furniture } from "./catalog.ts";
import { parseLayout } from "./layout.ts";

const catalog = catalogSchema.parse(rawCatalog);
const layout = parseLayout(rawLayout, catalog);
test("entrance is on the north wall and opens onto a walkable mat", () => {
  const entrance = layout.objects.find((object) => object.item === "door");
  const mat = layout.objects.find((object) => object.item === "doormat");
  expect(entrance?.y).toBe(0);
  expect(catalog.items.door?.layer).toBe("wall");
  expect(mat).toMatchObject({ x: layout.points.door?.x, y: layout.points.door?.y });
  expect(catalog.items.doormat?.blocks).toBe(false);
});
test("carpets cover all workspace furniture with a one-tile margin", () => {
  for (const zone of layout.zones) {
    const furniture = layout.objects.filter((object) =>
      [...zone.desks, ...zone.chairs].includes(object.id),
    );
    const x = Math.min(...furniture.map((object) => object.x)) - 1;
    const y = Math.min(...furniture.map((object) => object.y)) - 1;
    const right = Math.max(
      ...furniture.map(
        (object) => object.x + (catalog.items[object.item] as Furniture).footprint.w,
      ),
    );
    const bottom = Math.max(
      ...furniture.map(
        (object) => object.y + (catalog.items[object.item] as Furniture).footprint.h,
      ),
    );
    for (let row = y; row <= bottom; row++)
      for (let column = x; column <= right; column++)
        expect(layout.ground[row]?.[column]).toBe("c");
  }
});
test.each(["printer", "coffee-machine"])("%s is drawn above its cabinet", (id) => {
  const item = catalog.items[id] as Furniture;
  const cabinet = item.parts.find((part) => part.frame === "cabinet");
  const appliance = item.parts.find((part) => part.frame === id);
  expect(cabinet).toBeDefined();
  expect(appliance?.dy).toBeLessThan(cabinet?.dy as number);
  expect(appliance?.sortY).toBe(cabinet?.sortY);
  expect(appliance?.bias).toBeGreaterThan(cabinet?.bias as number);
});
