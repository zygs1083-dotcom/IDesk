import { catalogSchema, parseLayout } from "@idesk/shared/office-schemas";
import { expect, test } from "vitest";
import rawCatalog from "../../public/catalog.json";
import rawLayout from "../../public/layout.json";

const catalog = catalogSchema.parse(rawCatalog);
test("default layout validates", () => {
  expect(parseLayout(rawLayout, catalog).objects.length).toBeGreaterThan(0);
});
