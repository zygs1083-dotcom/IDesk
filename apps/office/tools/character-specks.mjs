import { chromatic, hueDistance } from "./character-hue.mjs";

export function colorfulSpecks(png, frame, locations = []) {
  let count = 0;
  for (let y = frame.y + 1; y < frame.y + frame.h - 1; y++) {
    for (let x = frame.x + 1; x < frame.x + frame.w - 1; x++) {
      const p = (y * png.width + x) * 4;
      const rgb = [...png.data.subarray(p, p + 3)];
      if (!png.data[p + 3] || !chromatic(rgb)) continue;
      const neighbors = [-png.width, -1, 1, png.width]
        .map((offset) => p + offset * 4)
        .filter((n) => png.data[n + 3])
        .map((n) => [...png.data.subarray(n, n + 3)]);
      if (neighbors.some((color) => color.every((v, i) => v === rgb[i]))) continue;
      if (
        neighbors.every(
          (color) =>
            (Math.max(...color) - Math.min(...color)) / Math.max(...color) < 0.1 ||
            hueDistance(rgb, color) > 40,
        )
      ) {
        count++;
        locations.push({ x, y });
      }
    }
  }
  return count;
}
