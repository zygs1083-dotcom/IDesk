import { expect, test } from "vitest";
import data from "../../public/scene.json";
import { sceneSchema } from "./scene.ts";
import { assignSeats, assignStanding } from "./seats.ts";

const scene = sceneSchema.parse(data);
const agents = (hosts: string[]) => hosts.map((host, i) => ({ id: String(i), host }));
test("hosts occupy zones in first appearance order, agents occupy seats in order", () => {
  const seats = assignSeats(agents(["a", "b", "a", "c", "d"]), scene);
  expect([...seats.values()]).toEqual([
    scene.zones[0]?.seats[0],
    scene.zones[1]?.seats[0],
    scene.zones[0]?.seats[1],
    scene.zones[2]?.seats[0],
    scene.zones[3]?.seats[0],
  ]);
});
test("more than four hosts wrap and full zones overflow into the next free zone", () => {
  const wrapped = assignSeats(agents(["a", "b", "c", "d", "e"]), scene);
  expect(wrapped.get("4")).toBe(scene.zones[0]?.seats[1]);
  const full = assignSeats(agents(Array(17).fill("a")), scene);
  expect(full.size).toBe(16);
  expect(full.get("4")).toBe(scene.zones[1]?.seats[0]);
  expect(new Set(full.values()).size).toBe(16);
});
test("hostZones fixes 1-based zones and leaves first-appearance ordering to other hosts", () => {
  const fixed = assignSeats(agents(["fixed", "a", "b", "fixed"]), {
    ...scene,
    hostZones: { fixed: 3 },
  });
  expect([...fixed.values()]).toEqual([
    scene.zones[2]?.seats[0],
    scene.zones[0]?.seats[0],
    scene.zones[1]?.seats[0],
    scene.zones[2]?.seats[1],
  ]);
});

test("up to sixteen agents need no standing spots", () => {
  for (const count of [0, 1, 16]) {
    const group = agents(Array(count).fill("a"));
    expect(assignStanding(group, assignSeats(group, scene), scene).size).toBe(0);
  }
});
test("the seventeenth agent takes the first lounge spot", () => {
  const group = agents(Array(17).fill("a"));
  expect([...assignStanding(group, assignSeats(group, scene), scene)]).toEqual([
    ["16", scene.lounge.spots[0]],
  ]);
});
test("full lounge spills into the aisle in agent order", () => {
  const group = agents(Array(16 + scene.lounge.spots.length + 2).fill("a"));
  const standing = assignStanding(group, assignSeats(group, scene), scene);
  expect([...standing.values()]).toEqual([...scene.lounge.spots, ...scene.standing.slice(0, 2)]);
});
test("agents beyond all standing spots remain unassigned", () => {
  const capacity = scene.lounge.spots.length + scene.standing.length;
  const group = agents(Array(16 + capacity + 1).fill("a"));
  const standing = assignStanding(group, assignSeats(group, scene), scene);
  expect(standing.size).toBe(capacity);
  expect(standing.has(String(16 + capacity))).toBe(false);
});
