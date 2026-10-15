import { readFile } from "node:fs/promises";
import { create } from "fontkit";
import { expect, test } from "vitest";
import { codepoints, dictionaryText, root, source } from "./font-slices.mjs";

const css = await readFile(new URL("src/fonts.css", root), "utf8");
const slices = [
  ...css.matchAll(/url\("([^"?]+)(?:\?[^" ]*)?"\)[\s\S]*?unicode-range:\s*([^;]+);/g),
].map(([, path, range]) => ({
  path,
  points: range.split(",").flatMap((part) => {
    const [start, end = start] = part
      .trim()
      .replace(/^U\+/i, "")
      .split("-")
      .map((hex) => Number.parseInt(hex, 16));
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }),
}));

test.each(slices)("committed $path cmap matches its CSS range", async ({ path, points }) => {
  const font = create(await readFile(new URL(`public${path}`, root)));
  // Subset format 4 adds U+FFFF as a .notdef sentinel rather than a mapped glyph.
  const actual = font.characterSet
    .filter((cp) => cp !== 0xffff || font.hasGlyphForCodePoint(cp))
    .toSorted((a, b) => a - b);
  expect(actual).toEqual(points);
});

test("the verified ranges partition the source cmap and the first two cover dictionary text", async () => {
  expect(slices.length).toBeGreaterThan(2);
  const flattened = slices.flatMap((slice) => slice.points);
  const union = new Set(flattened);
  expect(union.size).toBe(flattened.length);
  const original = create(await readFile(source)).characterSet.toSorted((a, b) => a - b);
  expect([...union].sort((a, b) => a - b)).toEqual(original);
  const sourcePoints = new Set(original);
  const basic = new Set(slices.slice(0, 2).flatMap((slice) => slice.points));
  expect(
    codepoints(await dictionaryText()).filter((cp) => sourcePoints.has(cp) && !basic.has(cp)),
  ).toEqual([]);
});
