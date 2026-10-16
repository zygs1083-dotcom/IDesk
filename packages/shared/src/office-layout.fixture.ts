import type { OfficeLayout } from "./office-layout.ts";

type Sample = OfficeLayout & {
  seats: [OfficeLayout["seats"][number]];
  zones: [OfficeLayout["zones"][number]];
  occluders: [OfficeLayout["occluders"][number]];
};
export function fixture(): Sample {
  return {
    size: { w: 1672, h: 941 },
    occluders: [
      {
        id: "desk",
        polygon: [
          [10, 10],
          [100, 10],
          [100, 80],
        ],
        baseline: 80,
        floorTop: 40,
      },
    ],
    grid: { cell: 16, clearance: 32, rows: Array.from({ length: 59 }, () => ".".repeat(105)) },
    seats: [
      { id: "seat", x: 32, y: 48, facing: "front", zone: "zone", workSpot: { x: 40, y: 20 } },
    ],
    zones: [{ id: "zone", seats: ["seat"], plaque: { x: 10, y: 10, w: 40, h: 10 } }],
    board: { x: 10, y: 10, w: 100, h: 100 },
    hostZones: { host: "zone" },
    points: Object.fromEntries(
      ["door", "doneTray", "bulletin", "board"].map((id) => [
        id,
        { x: 160, y: 160, facing: "down" as const },
      ]),
    ) as OfficeLayout["points"],
    drops: { doneTray: { x: 10, y: 10 }, bulletin: { x: 20, y: 20 } },
    standing: [],
    reception: { seat: "seat", counter: { x: 10, y: 10 } },
    meeting: { seats: ["seat"], workSpot: { x: 10, y: 10 } },
    lounge: ["seat"],
    spots: (
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
    ).map((id) => ({ id, x: 160, y: 160, facing: "right" })),
  };
}
