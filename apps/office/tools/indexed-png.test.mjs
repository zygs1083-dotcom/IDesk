import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { PNG } from "pngjs";
import { afterAll, expect, test } from "vitest";
import { palette } from "./furniture.mjs";
import { root } from "./furniture-image.mjs";
import { saveIndexedPng } from "./indexed-png.mjs";

const directory = mkdtempSync(join(tmpdir(), "office-indexed-"));
const colors = palette();
afterAll(() => rmSync(directory, { recursive: true }));

for (const [name, width, height] of [
  ["mixed", 4, 3],
  ["all-colors", 42, 1],
  ["transparent", 1, 1],
]) {
  test(`${name} preserves every RGBA byte with deterministic indexed encoding`, () => {
    const png = new PNG({ width, height });
    for (let i = 0; i < width * height; i++) {
      if (name === "all-colors" || (name === "mixed" && i % 3 !== 0))
        png.data.set([...colors[i], 255], i * 4);
    }
    const path = relative(root, join(directory, `${name}.png`));
    saveIndexedPng(path, png, colors);
    const first = readFileSync(join(directory, `${name}.png`));
    saveIndexedPng(path, png, colors);
    expect(readFileSync(join(directory, `${name}.png`)).equals(first)).toBe(true);
    const decoded = PNG.sync.read(first);
    expect([decoded.width, decoded.height]).toEqual([png.width, png.height]);
    expect(decoded.data.equals(png.data)).toBe(true);
    expect([first[24], first[25]]).toEqual([8, 3]);
    const chunks = new Map();
    for (let p = 8; p < first.length; ) {
      const length = first.readUInt32BE(p);
      chunks.set(first.toString("ascii", p + 4, p + 8), first.subarray(p + 8, p + 8 + length));
      p += length + 12;
    }
    expect(chunks.get("PLTE")).toEqual(Buffer.from([...colors.flat(), 0, 0, 0]));
    expect([...chunks.get("tRNS")]).toEqual([...Array(42).fill(255), 0]);
  });
}

for (const [label, rgba] of [
  ["color outside palette", [255, 0, 255, 255]],
  ["half-transparent pixel", [...colors[0], 128]],
  ["nonzero transparent RGB", [...colors[0], 0]],
]) {
  test(`rejects ${label}`, () => {
    const png = new PNG({ width: 1, height: 1 });
    png.data.set(rgba);
    expect(() =>
      saveIndexedPng(relative(root, join(directory, "invalid.png")), png, colors),
    ).toThrow();
  });
}
