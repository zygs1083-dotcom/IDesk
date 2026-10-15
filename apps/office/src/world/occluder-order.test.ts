import { readFileSync } from "node:fs";
import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { describe, expect, it } from "vitest";
import { zIndexOf } from "./sort.ts";

const layout = parseOfficeLayout(
  JSON.parse(readFileSync(new URL("../../assets/layout.json", import.meta.url), "utf8")),
);
const relationships = [
  { seat: "zone-1-back-left", ahead: ["zone-1-desk-back-left"], behind: [] },
  { seat: "zone-1-back-right", ahead: ["zone-1-desk-back-right"], behind: [] },
  {
    seat: "zone-1-front-left",
    ahead: ["zone-1-chair-front-left"],
    behind: ["zone-1-desk-front-left"],
  },
  {
    seat: "zone-1-front-right",
    ahead: ["zone-1-chair-front-right"],
    behind: ["zone-1-desk-front-right"],
  },
];
describe("work area 1 silhouette ordering", () => {
  for (const { seat: seatId, ahead, behind } of relationships) {
    it(`${seatId} is between its desk and chair`, () => {
      const seat = layout.seats.find((seat) => seat.id === seatId);
      expect(seat).toBeDefined();
      const y = (seat as (typeof layout.seats)[number]).y;
      for (const id of ahead) {
        const occluder = layout.occluders.find((item) => item.id === id);
        expect(occluder).toBeDefined();
        const baseline = (occluder as (typeof layout.occluders)[number]).baseline;
        expect(y).toBeLessThan(baseline);
        expect(zIndexOf(y, 1)).toBeLessThan(zIndexOf(baseline, 0));
      }
      for (const id of behind) {
        const occluder = layout.occluders.find((item) => item.id === id);
        expect(occluder).toBeDefined();
        const baseline = (occluder as (typeof layout.occluders)[number]).baseline;
        expect(y).toBeGreaterThan(baseline);
        expect(zIndexOf(y, 1)).toBeGreaterThan(zIndexOf(baseline, 0));
      }
    });
  }
});
