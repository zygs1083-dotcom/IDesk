import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { cutPolygon, enlargeCrop } from "./occluder-image.mjs";

describe("occluder rasterization", () => {
  it("keeps original RGB at interior pixel centers with binary alpha", () => {
    const source = new PNG({ width: 4, height: 4 });
    for (let p = 0; p < source.data.length; p += 4) source.data.set([p, 80, 120, 170], p);
    const polygon = [
      [1, 1],
      [4, 1],
      [1, 4],
    ];
    const { png, box } = cutPolygon(source, polygon);
    expect(box).toEqual({ x: 1, y: 1, w: 3, h: 3 });
    expect([...png.data.subarray(0, 4)]).toEqual([20, 80, 120, 255]);
    expect([...png.data.subarray(8, 12)]).toEqual([28, 80, 120, 255]);
    expect([...png.data.subarray(32, 36)]).toEqual([0, 0, 0, 0]);
    expect(new Set([...png.data].filter((_, i) => i % 4 === 3))).toEqual(new Set([0, 255]));
    expect(PNG.sync.write(cutPolygon(source, polygon).png)).toEqual(PNG.sync.write(png));
  });
  it("enlarges crops by exact nearest-neighbor replication", () => {
    const source = new PNG({ width: 2, height: 1 });
    source.data.set([10, 20, 30, 255, 40, 50, 60, 255]);
    const result = enlargeCrop(source, { x: 1, y: 0, w: 1, h: 1 });
    expect([result.width, result.height]).toEqual([3, 3]);
    for (let p = 0; p < result.data.length; p += 4)
      expect([...result.data.subarray(p, p + 4)]).toEqual([40, 50, 60, 255]);
  });
});
