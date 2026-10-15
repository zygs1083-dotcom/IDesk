import { describe, expect, it } from "vitest";
import { fixture } from "./office-layout.fixture.ts";
import { parseOfficeLayout } from "./office-layout.ts";

describe("v3 office layout", () => {
  it("accepts the complete layout", () => {
    expect(parseOfficeLayout(fixture())).toEqual(fixture());
  });
  it("accepts all destinations and seat references", () => {
    const value = fixture();
    value.points.door = { x: 160, y: 160, facing: "down" };
    value.standing = [{ x: 160, y: 160, facing: "left" }];
    value.reception = { seat: "seat", counter: { x: 10, y: 10 } };
    value.meeting = { seats: ["seat"], workSpot: { x: 10, y: 10 } };
    value.lounge = ["seat"];
    value.spots = (
      [
        "printer",
        "bookshelf",
        "whiteboard",
        "window",
        "plant",
        "sofa",
        "coffee",
        "meetingDoor",
      ] as const
    ).map((id) => ({ id, x: 160, y: 160, facing: "right" }));
    expect(parseOfficeLayout(value)).toEqual(value);
  });
  it.each(["points", "drops", "spots", "standing", "reception", "meeting", "lounge"])(
    "requires %s",
    (field) => {
      const value = { ...fixture() } as Record<string, object | string | undefined>;
      delete value[field];
      expect(() => parseOfficeLayout(value)).toThrow();
    },
  );
  it("rejects drops outside the background", () => {
    const value = fixture();
    value.drops.bulletin.x = 1672;
    expect(() => parseOfficeLayout(value)).toThrow();
  });
  it.each([
    ["short grid", (v: ReturnType<typeof fixture>) => v.grid.rows.pop()],
    [
      "short row",
      (v: ReturnType<typeof fixture>) => {
        v.grid.rows[0] = ".";
      },
    ],
    [
      "invalid cell",
      (v: ReturnType<typeof fixture>) => {
        v.grid.rows[0] = "?".repeat(105);
      },
    ],
    ["duplicate id", (v: ReturnType<typeof fixture>) => v.seats.push({ ...v.seats[0] })],
    [
      "cross-category id",
      (v: ReturnType<typeof fixture>) => {
        v.occluders[0].id = "seat";
      },
    ],
    [
      "short polygon",
      (v: ReturnType<typeof fixture>) => {
        v.occluders[0].polygon = [
          [1, 1],
          [2, 2],
        ];
      },
    ],
    [
      "outside vertex",
      (v: ReturnType<typeof fixture>) => {
        v.occluders[0].polygon[0] = [1672, 10];
      },
    ],
    [
      "baseline",
      (v: ReturnType<typeof fixture>) => {
        v.occluders[0].baseline = 942;
      },
    ],
    [
      "zone reference",
      (v: ReturnType<typeof fixture>) => {
        v.zones[0].seats = ["missing"];
      },
    ],
    [
      "reception reference",
      (v: ReturnType<typeof fixture>) => {
        v.reception = { seat: "missing", counter: { x: 1, y: 1 } };
      },
    ],
    [
      "meeting reference",
      (v: ReturnType<typeof fixture>) => {
        v.meeting = { seats: ["missing"], workSpot: { x: 1, y: 1 } };
      },
    ],
    [
      "lounge reference",
      (v: ReturnType<typeof fixture>) => {
        v.lounge = ["missing"];
      },
    ],
    [
      "missing zone",
      (v: ReturnType<typeof fixture>) => {
        v.seats[0].zone = "missing";
      },
    ],
    [
      "missing membership",
      (v: ReturnType<typeof fixture>) => {
        v.zones[0].seats = [];
      },
    ],
    [
      "missing seat zone",
      (v: ReturnType<typeof fixture>) => {
        delete v.seats[0].zone;
      },
    ],
    [
      "duplicate membership",
      (v: ReturnType<typeof fixture>) => {
        v.zones[0].seats.push("seat");
      },
    ],
    [
      "host zone",
      (v: ReturnType<typeof fixture>) => {
        v.hostZones.host = "missing";
      },
    ],
    [
      "outside board",
      (v: ReturnType<typeof fixture>) => {
        v.board.w = 1672;
      },
    ],
    [
      "outside plaque",
      (v: ReturnType<typeof fixture>) => {
        v.zones[0].plaque.h = 941;
      },
    ],
    [
      "outside workSpot",
      (v: ReturnType<typeof fixture>) => {
        v.seats[0].workSpot.x = 1672;
      },
    ],
    [
      "blocked seat",
      (v: ReturnType<typeof fixture>) => {
        v.grid.rows[3] = "#".repeat(105);
      },
    ],
    [
      "blocked point",
      (v: ReturnType<typeof fixture>) => {
        v.points.door = { x: 0, y: 0, facing: "down" };
        v.grid.rows[0] = "#".repeat(105);
      },
    ],
    [
      "blocked standing",
      (v: ReturnType<typeof fixture>) => {
        v.standing = [{ x: 0, y: 0, facing: "down" }];
        v.grid.rows[0] = "#".repeat(105);
      },
    ],
    [
      "outside position",
      (v: ReturnType<typeof fixture>) => {
        v.seats[0].x = 1672;
      },
    ],
  ])("rejects %s", (_, mutate) => {
    const value = fixture();
    mutate(value);
    expect(() => parseOfficeLayout(value)).toThrow();
  });
  it("accepts a ground baseline below the extracted silhouette", () => {
    const value = fixture();
    value.occluders[0].baseline = 100;
    expect(parseOfficeLayout(value)).toEqual(value);
  });
  it("keeps the partial last row and column usable inside the image", () => {
    const value = fixture();
    value.standing = [{ x: 1671, y: 940, facing: "back" }];
    expect(parseOfficeLayout(value)).toEqual(value);
  });
});
