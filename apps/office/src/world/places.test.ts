import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { expect, test } from "vitest";
import rawLayout from "../../public/layout.json";
import { assignSeats, assignStanding, chatSeats, departure, workSpot } from "./places.ts";

const layout = parseOfficeLayout(rawLayout);
const available = layout.seats;
const agents = (hosts: string[]) => hosts.map((host, i) => ({ id: String(i), host }));
const zoneSeats = layout.zones.map((zone) =>
  zone.seats.map((id) => available.find((seat) => seat.id === id)),
);

test("hosts and seats follow first appearance order", () => {
  expect([...assignSeats(agents(["a", "b", "a", "c", "d"]), layout).values()]).toEqual([
    zoneSeats[0]?.[0],
    zoneSeats[1]?.[0],
    zoneSeats[0]?.[1],
    zoneSeats[2]?.[0],
    zoneSeats[3]?.[0],
  ]);
});
test("hosts wrap and full zones overflow into the next free zone", () => {
  expect(assignSeats(agents(["a", "b", "c", "d", "e"]), layout).get("4")).toEqual(
    zoneSeats[0]?.[1],
  );
  const assigned = assignSeats(agents(Array(17).fill("a")), layout);
  expect(assigned.size).toBe(16);
  expect(assigned.get("4")).toEqual(zoneSeats[1]?.[0]);
  expect(new Set([...assigned.values()].map((seat) => seat.id)).size).toBe(16);
});
test("hostZones fixes named zones while other hosts retain their order", () => {
  expect([
    ...assignSeats(agents(["fixed", "a", "b", "fixed"]), {
      ...layout,
      hostZones: { fixed: layout.zones[2]?.id as string },
    }).values(),
  ]).toEqual([zoneSeats[2]?.[0], zoneSeats[0]?.[0], zoneSeats[1]?.[0], zoneSeats[2]?.[1]]);
});
test.each([0, 1, 16])("%i seated agents need no standing spots", (count) => {
  const group = agents(Array(count).fill("a"));
  expect(assignStanding(group, assignSeats(group, layout), layout).size).toBe(0);
});
test("overflow agents fill standing cells in order then remain unassigned", () => {
  const group = agents(Array(17 + layout.standing.length).fill("a"));
  const standing = assignStanding(group, assignSeats(group, layout), layout);
  expect([...standing.values()].map(({ x, y, facing }) => ({ x, y, facing }))).toEqual(
    layout.standing,
  );
  expect(standing.has(String(16 + layout.standing.length))).toBe(false);
});
test("cards sort with the silhouette containing their workSpot, with seat fallback", () => {
  const seat = available.find((seat) => seat.id === "zone-1-back-left");
  if (!seat) throw new Error("Missing back seat");
  expect(workSpot(seat.workSpot, seat.y, layout).sortY).toBe(301);
  const front = available.find((seat) => seat.id === "zone-1-front-left");
  if (!front) throw new Error("Missing front seat");
  expect(workSpot(front.workSpot, front.y, layout).sortY).toBe(360);
  expect(workSpot({ x: 800, y: 800 }, 544, layout).sortY).toBe(544);
});

test.each([
  ["front", false, { x: 1, y: 1 }],
  ["front", true, { x: 3, y: 1 }],
  ["back", false, { x: 1, y: 3 }],
  ["back", true, { x: 3, y: 3 }],
  ["down", false, { x: 2, y: 1 }],
  ["left", false, { x: 3, y: 2 }],
  ["right", false, { x: 1, y: 2 }],
] as const)("departure follows the reverse of %s with mirror=%s", (facing, mirror, expected) => {
  const open = { ...layout, grid: { cell: 16 as const, rows: Array(5).fill(".....") } };
  expect(departure({ x: 40, y: 40, facing, mirror }, open)).toEqual(expected);
});

test("a blocked departure cancels chat rather than placing people in furniture", () => {
  const blocked = { ...layout, grid: { cell: 16 as const, rows: Array(5).fill("#####") } };
  expect(chatSeats({ x: 40, y: 40, facing: "front" }, blocked)).toBeUndefined();
});
