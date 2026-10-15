import { catalogSchema, parseLayout } from "@idesk/shared/office-schemas";
import { expect, test } from "vitest";
import rawCatalog from "../../public/catalog.json";
import rawLayout from "../../public/layout.json";
import { cellCenter } from "./path.ts";
import { assignSeats, assignStanding, deskFor } from "./places.ts";
import { seats } from "./seats.ts";

const catalog = catalogSchema.parse(rawCatalog);
const layout = parseLayout(rawLayout, catalog);
const available = seats(layout, catalog);
const agents = (hosts: string[]) => hosts.map((host, i) => ({ id: String(i), host }));
const zoneSeats = layout.zones.map((zone) =>
  zone.chairs.map((id) => available.find((seat) => seat.id === id)),
);

test("hosts and seats follow first appearance order", () => {
  expect([...assignSeats(agents(["a", "b", "a", "c", "d"]), layout, catalog).values()]).toEqual([
    zoneSeats[0]?.[0],
    zoneSeats[1]?.[0],
    zoneSeats[0]?.[1],
    zoneSeats[2]?.[0],
    zoneSeats[3]?.[0],
  ]);
});
test("hosts wrap and full zones overflow into the next free zone", () => {
  expect(assignSeats(agents(["a", "b", "c", "d", "e"]), layout, catalog).get("4")).toEqual(
    zoneSeats[0]?.[1],
  );
  const assigned = assignSeats(agents(Array(17).fill("a")), layout, catalog);
  expect(assigned.size).toBe(16);
  expect(assigned.get("4")).toEqual(zoneSeats[1]?.[0]);
  expect(new Set([...assigned.values()].map((seat) => seat.id)).size).toBe(16);
});
test("hostZones fixes named zones while other hosts retain their order", () => {
  expect([
    ...assignSeats(
      agents(["fixed", "a", "b", "fixed"]),
      { ...layout, hostZones: { fixed: layout.zones[2]?.id as string } },
      catalog,
    ).values(),
  ]).toEqual([zoneSeats[2]?.[0], zoneSeats[0]?.[0], zoneSeats[1]?.[0], zoneSeats[2]?.[1]]);
});
test.each([0, 1, 16])("%i seated agents need no standing spots", (count) => {
  const group = agents(Array(count).fill("a"));
  expect(assignStanding(group, assignSeats(group, layout, catalog), layout).size).toBe(0);
});
test("overflow agents fill standing cells in order then remain unassigned", () => {
  const group = agents(Array(17 + layout.standing.length).fill("a"));
  const standing = assignStanding(group, assignSeats(group, layout, catalog), layout);
  expect([...standing.values()].map(({ x, y, facing }) => ({ x, y, facing }))).toEqual(
    layout.standing.map(cellCenter),
  );
  expect(standing.has(String(16 + layout.standing.length))).toBe(false);
});
for (const seat of available) {
  test(`${seat.id} has a desk exactly when it is a work, meeting or reception seat`, () => {
    const desk = deskFor(seat, layout, catalog);
    if (layout.lounge.includes(seat.id)) expect(desk).toBeUndefined();
    else
      expect(desk).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          sortY: expect.any(Number),
        }),
      );
  });
}
test("standing cells have no desk", () => {
  for (const point of layout.standing)
    expect(deskFor(cellCenter(point), layout, catalog)).toBeUndefined();
});
