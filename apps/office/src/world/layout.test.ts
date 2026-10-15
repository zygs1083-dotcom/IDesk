import { expect, test } from "vitest";
import rawCatalog from "../../public/catalog.json";
import rawLayout from "../../public/layout.json";
import { catalogSchema } from "./catalog.ts";
import { parseLayout } from "./layout.ts";

const catalog = catalogSchema.parse(rawCatalog);
test("default layout validates", () => {
  expect(parseLayout(rawLayout, catalog).objects.length).toBeGreaterThan(0);
});
test.each([
  (layout: typeof rawLayout) => layout.ground.pop(),
  (layout: typeof rawLayout) => layout.ground.splice(2, 1, "w"),
  (layout: typeof rawLayout) =>
    layout.objects.push({ id: "outside", item: "counter", x: 39, y: 23 }),
  (layout: typeof rawLayout) => layout.objects.push({ id: "unknown", item: "missing", x: 0, y: 3 }),
  (layout: typeof rawLayout) => layout.zones[0]?.chairs.push("missing"),
])("rejects invalid layout %i", (mutate) => {
  const layout = structuredClone(rawLayout);
  mutate(layout);
  expect(() => parseLayout(layout, catalog)).toThrow();
});
