import { readFile } from "node:fs/promises";
import { create } from "fontkit";
import { expect, test } from "vitest";
import {
  codepoints,
  dictionaryText,
  mappedPoints,
  planSlices,
  root,
  source,
  unicodeRange,
} from "./font-slices.mjs";

test("shipped slices partition the complete source cmap and match the CSS", async () => {
  const slices = await planSlices();
  const original = create(await readFile(source));
  const seen = new Set();
  const css = await readFile(new URL("src/fonts.css", root), "utf8");
  for (const slice of slices) {
    const font = create(
      await readFile(new URL(`public/fonts/fusion-pixel-${slice.name}.woff2`, root)),
    );
    expect(mappedPoints(font)).toEqual(slice.points);
    expect(css.replace(/\s+/g, " ")).toContain(`unicode-range: ${unicodeRange(slice.points)};`);
    for (const cp of mappedPoints(font)) {
      expect(seen.has(cp), `overlapping U+${cp.toString(16)}`).toBe(false);
      seen.add(cp);
    }
    if (/^\d+$/.test(slice.name)) expect(slice.points.length).toBeGreaterThanOrEqual(150);
    if (/^\d+$/.test(slice.name)) expect(slice.points.length).toBeLessThanOrEqual(300);
  }
  expect([...seen].sort((a, b) => a - b)).toEqual(mappedPoints(original));
});

test("ASCII plus dictionary slice cover every supported dictionary character", async () => {
  const [ascii, dictionary] = await planSlices();
  const original = new Set(create(await readFile(source)).characterSet);
  const basic = new Set(ascii.points);
  const expected = codepoints(await dictionaryText())
    .filter((cp) => original.has(cp) && !basic.has(cp))
    .sort((a, b) => a - b);
  expect(dictionary.points).toEqual(expected);
});
