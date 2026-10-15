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
      },
    ],
    grid: { cell: 16, rows: Array.from({ length: 59 }, () => ".".repeat(105)) },
    seats: [
      { id: "seat", x: 32, y: 48, facing: "front", zone: "zone", workSpot: { x: 40, y: 20 } },
    ],
    zones: [{ id: "zone", seats: ["seat"], plaque: { x: 10, y: 10, w: 40, h: 10 } }],
    board: { x: 10, y: 10, w: 100, h: 100 },
    hostZones: { host: "zone" },
  };
}
