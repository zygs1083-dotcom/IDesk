import { expect, test } from "vitest";
import { catalogSchema, type Layout, layoutSchema, parseLayout } from "./office-schemas.ts";

const rawItem = {
  footprint: { w: 2, h: 2 },
  blocks: true,
  parts: [{ frame: "counter", dx: 0, dy: 0, sortY: 32, bias: 0 }],
};
const catalog = catalogSchema.parse({ tile: 32, items: { counter: rawItem } });
const validLayout: Layout = {
  reception: { chair: "counter", counter: "counter" },
  meeting: { table: "counter", chairs: Array(6).fill("counter") },
  lounge: ["counter"],
  standing: [{ x: 0, y: 0, facing: "down" }],
  size: { w: 4, h: 4 },
  ground: Array(4).fill("wwww"),
  objects: [{ id: "counter", item: "counter", x: 0, y: 0 }],
  zones: [{ id: "workspace", desks: ["counter"], chairs: ["counter"], plaque: "counter" }],
  points: { door: { x: 0, y: 0, facing: "up" } },
  spots: [{ id: "coffee", x: 0, y: 0, facing: "left" }],
  hostZones: { fixed: "workspace" },
};

test("catalog defaults furniture to the object layer", () => {
  expect(catalog.items.counter?.layer).toBe("object");
});

test.each([
  { tile: 16, items: {} },
  { tile: 32, items: { counter: { ...rawItem, footprint: { w: 0, h: 2 } } } },
  { tile: 32, items: { counter: { ...rawItem, parts: [] } } },
  { tile: 32, items: { counter: { ...rawItem, parts: [{ ...rawItem.parts[0], bias: 2 }] } } },
  { tile: 32, items: { counter: { ...rawItem, seat: { x: 0, y: 0, facing: "north" } } } },
])("rejects invalid catalog fields %i", (value) => {
  expect(catalogSchema.safeParse(value).success).toBe(false);
});

test("layout validates with catalog references", () => {
  expect(parseLayout(validLayout, catalog)).toEqual(validLayout);
});

test.each([
  [(layout: Layout) => layout.ground.pop(), "Ground dimensions do not match size"],
  [(layout: Layout) => layout.ground.splice(2, 1, "w"), "Ground dimensions do not match size"],
  [
    (layout: Layout) => layout.objects.push({ id: "outside", item: "counter", x: 3, y: 3 }),
    "Object outside map: outside",
  ],
  [
    (layout: Layout) => layout.objects.push({ id: "unknown", item: "missing", x: 0, y: 3 }),
    "Unknown item: missing",
  ],
  [
    (layout: Layout) => layout.objects.push({ id: "counter", item: "counter", x: 0, y: 0 }),
    "Duplicate object id",
  ],
  [(layout: Layout) => layout.zones[0]?.chairs.push("missing"), "Unknown zone object: missing"],
  [
    (layout: Layout) => {
      layout.reception.chair = "missing";
    },
    "Unknown place object: missing",
  ],
  [
    (layout: Layout) => {
      layout.meeting.table = "missing";
    },
    "Unknown place object: missing",
  ],
  [
    (layout: Layout) => layout.meeting.chairs.splice(0, 1, "missing"),
    "Unknown place object: missing",
  ],
  [(layout: Layout) => layout.lounge.push("missing"), "Unknown place object: missing"],
  [
    (layout: Layout) => Object.assign(layout.hostZones, { test: "missing" }),
    "Unknown host zone: missing",
  ],
] as const)("rejects invalid layout references %i", (mutate, message) => {
  const layout = structuredClone(validLayout);
  mutate(layout);
  expect(() => parseLayout(layout, catalog)).toThrow(message);
});

test.each([
  { ...validLayout, hostZones: { fixed: 1 } },
  { ...validLayout, objects: [{ id: "counter", item: "counter", x: -1, y: 0 }] },
  { ...validLayout, meeting: { table: "counter", chairs: ["counter"] } },
  { ...validLayout, standing: [{ x: 0.5, y: 0, facing: "down" }] },
])("rejects invalid layout fields %i", (value) => {
  expect(layoutSchema.safeParse(value).success).toBe(false);
});
