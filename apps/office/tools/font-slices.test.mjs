import { readFile } from "node:fs/promises";
import { create } from "fontkit";
import { expect, test } from "vitest";
import { codepoints, dictionaryText, root, source } from "./font-slices.mjs";

const expand = (range) =>
  range.split(",").flatMap((part) => {
    const [start, end = start] = part
      .trim()
      .replace(/^U\+/i, "")
      .split("-")
      .map((hex) => Number.parseInt(hex, 16));
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

test("committed CSS and font cmaps partition the source and cover dictionary text in the first two slices", async () => {
  const css = await readFile(new URL("src/fonts.css", root), "utf8");
  const entries = [
    ...css.matchAll(/url\("([^"?]+)(?:\?[^" ]*)?"\)[\s\S]*?unicode-range:\s*([^;]+);/g),
  ];
  const slices = await Promise.all(
    entries.map(async ([, path, range]) => {
      const font = create(await readFile(new URL(`public${path}`, root)));
      const points = font.characterSet
        .filter((cp) => cp !== 0xffff || font.hasGlyphForCodePoint(cp))
        .toSorted((a, b) => a - b);
      expect(points).toEqual(expand(range));
      return points;
    }),
  );
  expect(slices.length).toBeGreaterThan(2);
  const flattened = slices.flat();
  const union = new Set(flattened);
  expect(union.size).toBe(flattened.length);
  const original = create(await readFile(source)).characterSet.toSorted((a, b) => a - b);
  expect([...union].sort((a, b) => a - b)).toEqual(original);
  const sourcePoints = new Set(original);
  const basic = new Set(slices.slice(0, 2).flat());
  expect(
    codepoints(await dictionaryText()).filter((cp) => sourcePoints.has(cp) && !basic.has(cp)),
  ).toEqual([]);
});
