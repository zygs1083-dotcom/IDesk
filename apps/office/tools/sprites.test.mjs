import { expect, test } from "vitest";
import { palette, verify } from "./furniture.mjs";
import { bounds, crop, readJson, readPng } from "./furniture-image.mjs";

const atlas = readPng("public/sprites.png");
const { frames, animations } = readJson("public/sprites.json");
const headWidth = (png) => {
  const box = bounds(png);
  return bounds(crop(png, { x: box.x, y: box.y, w: box.w, h: Math.floor(box.h / 2) })).w;
};

test("the complete character atlas contains only opaque palette pixels or clear pixels", () => {
  expect(() => verify(atlas, palette())).not.toThrow();
});

for (const kind of ["claude-code", "codex", "n8n", "script", "custom", "receptionist"]) {
  test(`${kind} provides four-direction seated poses with seated proportions`, () => {
    const standing = crop(atlas, frames[`${kind}/walk/down/0`].frame);
    for (const direction of ["right", "down", "up"]) {
      expect(frames[`${kind}/sit/${direction}`]).toBeDefined();
      expect(animations[`${kind}/typing/${direction}`]).toEqual(
        [0, 1].map((i) => `${kind}/typing/${direction}/${i}`),
      );
    }
    for (const direction of ["down", "up"]) {
      for (const pose of [`sit/${direction}`, `typing/${direction}/0`, `typing/${direction}/1`]) {
        const png = crop(atlas, frames[`${kind}/${pose}`].frame);
        const box = bounds(png);
        expect(box.h / bounds(standing).h).toBeGreaterThanOrEqual(0.85);
        expect(box.h / bounds(standing).h).toBeLessThanOrEqual(0.9);
        expect(headWidth(png) / headWidth(standing)).toBeGreaterThanOrEqual(0.9);
        expect(headWidth(png) / headWidth(standing)).toBeLessThanOrEqual(1.1);
        expect(box.y + box.h).toBe(96);
      }
    }
  });
}
