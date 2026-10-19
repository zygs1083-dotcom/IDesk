import { expect, it } from "vitest";
import { linePath, segments } from "./chart-geometry.ts";

it("breaks a chart after two missing bucket widths", () => {
  const at = (seconds: number) => ({ ts: new Date(seconds * 1000).toISOString(), value: seconds });
  expect(segments([at(0), at(10), at(30), at(60)], 10).map((part) => part.length)).toEqual([3, 1]);
  expect(
    linePath(
      [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
      true,
    ),
  ).toBe("M1,2H3V4");
});
