import { catalogSchema, type Furniture, parseLayout, TILE } from "@idesk/shared/office-schemas";
import { expect, test } from "vitest";
import rawCatalog from "../../public/catalog.json";
import rawLayout from "../../public/layout.json";
import { deskFor } from "./places.ts";
import { seats } from "./seats.ts";
import { zIndexOf } from "./sort.ts";

const catalog = catalogSchema.parse(rawCatalog);
const layout = parseLayout(rawLayout, catalog);
test("sort by contact line, then bias", () => {
  const keys = [
    { sortY: 8, bias: 1 as const },
    { sortY: 4, bias: 1 as const },
    { sortY: 4, bias: 0 as const },
  ];
  expect([...keys].sort((a, b) => zIndexOf(a.sortY, a.bias) - zIndexOf(b.sortY, b.bias))).toEqual([
    keys[2],
    keys[1],
    keys[0],
  ]);
  expect(keys[0]?.sortY).toBe(8);
});
for (const seat of seats(layout, catalog)) {
  test(`seat ${seat.id} places person between chair parts and on correct side of desk`, () => {
    const object = layout.objects.find((object) => object.id === seat.id);
    expect(object).toBeDefined();
    if (!object) return;
    const chair = catalog.items[object.item] as Furniture;
    const person = { id: "person", sortY: seat.y, bias: 0 as const };
    const parts = chair.parts.map((part) => ({
      id: part.frame,
      sortY: object.y * TILE + part.sortY,
      bias: part.bias,
    }));
    const ordered = [...parts, person]
      .sort((a, b) => zIndexOf(a.sortY, a.bias) - zIndexOf(b.sortY, b.bias))
      .map((part) => part.id);
    expect(ordered.findIndex((id) => id.endsWith("behind"))).toBeLessThan(
      ordered.indexOf("person"),
    );
    expect(ordered.findIndex((id) => id.endsWith("front"))).toBeGreaterThan(
      ordered.indexOf("person"),
    );
    expect(seat.x).toBe(object.x * TILE + (chair.seat?.x ?? 0));
    if (object.item === "sofa") return;
    const desk = deskFor(seat, layout, catalog);
    expect(desk).toBeDefined();
    if (!desk) return;
    const deskIndex = zIndexOf(desk.sortY, 0);
    const personIndex = zIndexOf(person.sortY, 0);
    if (seat.facing === "up") expect(deskIndex).toBeLessThan(personIndex);
    else expect(deskIndex).toBeGreaterThan(personIndex);
    expect(zIndexOf(desk.sortY, 1)).toBeGreaterThan(deskIndex);
  });
}
