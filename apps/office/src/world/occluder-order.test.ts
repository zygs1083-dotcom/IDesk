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
  { seat: "zone-2-back-left", ahead: ["zone-2-desk-back-left"], behind: [] },
  { seat: "zone-2-back-right", ahead: ["zone-2-desk-back-right"], behind: [] },
  {
    seat: "zone-2-front-left",
    ahead: ["zone-2-chair-front-left"],
    behind: ["zone-2-desk-front-left"],
  },
  {
    seat: "zone-2-front-right",
    ahead: ["zone-2-chair-front-right"],
    behind: ["zone-2-desk-front-right"],
  },
  { seat: "zone-3-back-left", ahead: ["zone-3-desk-back-left"], behind: [] },
  { seat: "zone-3-back-right", ahead: ["zone-3-desk-back-right"], behind: [] },
  {
    seat: "zone-3-front-left",
    ahead: ["zone-3-chair-front-left"],
    behind: ["zone-3-desk-front-left"],
  },
  {
    seat: "zone-3-front-right",
    ahead: ["zone-3-chair-front-right"],
    behind: ["zone-3-desk-front-right"],
  },
  { seat: "zone-4-back-left", ahead: ["zone-4-desk-back-left"], behind: [] },
  { seat: "zone-4-back-right", ahead: ["zone-4-desk-back-right"], behind: [] },
  {
    seat: "zone-4-front-left",
    ahead: ["zone-4-chair-front-left"],
    behind: ["zone-4-desk-front-left"],
  },
  {
    seat: "zone-4-front-right",
    ahead: ["zone-4-chair-front-right"],
    behind: ["zone-4-desk-front-right"],
  },
  { seat: "reception-seat", ahead: ["reception-counter"], behind: [] },
  ...["left", "middle", "right"].flatMap((side) => [
    { seat: `meeting-back-${side}`, ahead: ["meeting-table"], behind: [] },
    {
      seat: `meeting-front-${side}`,
      ahead: [`meeting-chair-front-${side}`],
      behind: ["meeting-table"],
    },
  ]),
  ...["left", "right"].map((side) => ({
    seat: `lounge-back-${side}`,
    ahead: ["lounge-sofa-front", "lounge-coffee-table"],
    behind: [],
  })),
  {
    seat: "lounge-side",
    ahead: ["lounge-sofa-side-arm", "lounge-sofa-side-apron", "lounge-coffee-table"],
    behind: [],
  },
];
describe("office silhouette ordering", () => {
  for (const { seat: seatId, ahead, behind } of relationships) {
    it(`${seatId} has the measured silhouette ordering`, () => {
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
