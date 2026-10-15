import { expect, test } from "vitest";
import rawCatalog from "../../public/catalog.json";
import rawLayout from "../../public/layout.json";
import { catalogSchema, type Furniture, TILE } from "./catalog.ts";
import { parseLayout } from "./layout.ts";
import { seats } from "./seats.ts";
import { sortDrawables } from "./sort.ts";

const catalog = catalogSchema.parse(rawCatalog);
const layout = parseLayout(rawLayout, catalog);
test("sort by contact line, then bias", () => {
  const keys = [
    { sortY: 8, bias: 9 },
    { sortY: 4, bias: 2 },
    { sortY: 4, bias: 0 },
  ];
  expect(sortDrawables(keys)).toEqual([keys[2], keys[1], keys[0]]);
  expect(keys[0]?.sortY).toBe(8);
});
for (const seat of seats(layout, catalog)) {
  test(`seat ${seat.id} places person between chair parts and on correct side of desk`, () => {
    const object = layout.objects.find((object) => object.id === seat.id);
    expect(object).toBeDefined();
    if (!object) return;
    const chair = catalog.items[object.item] as Furniture;
    const person = { id: "person", sortY: seat.y, bias: 0 };
    const parts = chair.parts.map((part) => ({
      id: part.frame,
      sortY: object.y * TILE + part.sortY,
      bias: part.bias,
    }));
    const ordered = sortDrawables([...parts, person]).map((part) => part.id);
    expect(ordered.findIndex((id) => id.endsWith("behind"))).toBeLessThan(
      ordered.indexOf("person"),
    );
    expect(ordered.findIndex((id) => id.endsWith("front"))).toBeGreaterThan(
      ordered.indexOf("person"),
    );
    expect(seat.x).toBe(object.x * TILE + (chair.seat?.x ?? 0));
    const dy = seat.facing === "down" ? 1 : -1;
    const desk = layout.objects.find((candidate) => {
      const item = catalog.items[candidate.item] as Furniture;
      return (
        (item.workSpot || candidate.item === "counter") &&
        candidate.y === Math.floor(seat.y / TILE) + dy &&
        Math.floor(seat.x / TILE) >= candidate.x &&
        Math.floor(seat.x / TILE) < candidate.x + item.footprint.w
      );
    });
    expect(desk).toBeDefined();
    if (!desk) return;
    const item = catalog.items[desk.item] as Furniture;
    for (const part of item.parts) {
      const deskY = desk.y * TILE + part.sortY;
      if (seat.facing === "down") expect(deskY).toBeGreaterThan(person.sortY);
      else expect(deskY).toBeLessThan(person.sortY);
    }
  });
}
