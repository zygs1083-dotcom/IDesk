import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { create } from "fontkit";
import subsetFont from "subset-font";

export const root = new URL("../", import.meta.url);
export const source = new URL(
  "assets/fonts/fusion-pixel-12px-proportional-zh_hans.otf.woff2",
  root,
);
export const mappedPoints = (font) =>
  font.characterSet.filter((cp) => font.hasGlyphForCodePoint(cp)).toSorted((a, b) => a - b);
export const codepoints = (text) => [...new Set(Array.from(text, (char) => char.codePointAt(0)))];

export async function dictionaryText() {
  const files = await Promise.all(
    ["zh", "en"].map((lang) => readFile(new URL(`src/i18n/${lang}.ts`, root), "utf8")),
  );
  return files.join("");
}

export async function planSlices() {
  const font = create(await readFile(source));
  const points = mappedPoints(font);
  const dictionary = new Set(codepoints(await dictionaryText()));
  const files = await readdir(new URL("src/", root), { recursive: true });
  const ui = (
    await Promise.all(
      files
        .filter((file) => /\.(ts|tsx)$/.test(file))
        .map((file) => readFile(new URL(`src/${file}`, root), "utf8")),
    )
  ).join("");
  const symbols = new Set(
    codepoints(ui).filter((cp) => /[\p{P}\p{S}]/u.test(String.fromCodePoint(cp))),
  );
  // Pixi measures font ascent with É and Å before drawing canvas text.
  const ascii = points.filter(
    (cp) =>
      cp <= 0x7f || cp === 0xc5 || cp === 0xc9 || symbols.has(cp) || (cp >= 0xff01 && cp <= 0xff65),
  );
  const basic = new Set(ascii);
  const dict = points.filter((cp) => !basic.has(cp) && dictionary.has(cp));
  const rest = points.filter((cp) => !basic.has(cp) && !dictionary.has(cp));
  const slices = [
    { name: "ascii", points: ascii },
    { name: "dictionary", points: dict },
  ];
  const size = Math.ceil(rest.length / Math.ceil(rest.length / 256));
  for (let start = 0; start < rest.length; start += size) {
    slices.push({
      name: String(slices.length - 1).padStart(3, "0"),
      points: rest.slice(start, start + size),
    });
  }
  return slices;
}

export function unicodeRange(points) {
  const ranges = [];
  for (const cp of points) {
    const last = ranges.at(-1);
    if (last && last[1] + 1 === cp) last[1] = cp;
    else ranges.push([cp, cp]);
  }
  const hex = (cp) => cp.toString(16).toUpperCase();
  return ranges.map(([a, b]) => `U+${hex(a)}${a === b ? "" : `-${hex(b)}`}`).join(", ");
}

async function generate() {
  const buffer = await readFile(source);
  const slices = await planSlices();
  const directory = new URL("public/fonts/", root);
  for (const file of await readdir(directory)) {
    if (/^fusion-pixel-.*\.woff2$/.test(file)) await unlink(new URL(file, directory));
  }
  const css = [];
  let bytes = 0;
  for (const slice of slices) {
    const text = String.fromCodePoint(...slice.points);
    const subset = await subsetFont(buffer, text, { targetFormat: "woff2" });
    await writeFile(new URL(`fusion-pixel-${slice.name}.woff2`, directory), subset);
    bytes += subset.length;
    css.push(`@font-face {
  font-family: "Fusion Pixel";
  src: url("/fonts/fusion-pixel-${slice.name}.woff2?v=${createHash("sha256").update(subset).digest("hex").slice(0, 12)}") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: ${unicodeRange(slice.points)};
}`);
  }
  await writeFile(new URL("src/fonts.css", root), `${css.join("\n")}\n`);
  execFileSync(fileURLToPath(new URL("../../node_modules/.bin/biome", root)), [
    "format",
    "--write",
    fileURLToPath(new URL("src/fonts.css", root)),
  ]);
  console.log(
    `${slices.length} slices, ${slices.reduce((sum, slice) => sum + slice.points.length, 0)} codepoints, ${bytes} bytes`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(process.argv[1]))
) {
  await generate();
}
