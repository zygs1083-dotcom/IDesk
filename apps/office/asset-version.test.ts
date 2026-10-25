import { mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { officeAssetVersion } from "./asset-version.ts";

vi.mock("node:fs", { spy: true });

const roots: string[] = [];
const media = {
  "background.webp": Buffer.from([0, 255, 1]),
  "background-dusk.webp": "dusk",
  "background-night.webp": "night",
  "occluders.png": "day image",
  "occluders.json": '{"image":"occluders.png"}',
  "occluders-dusk.png": "dusk image",
  "occluders-dusk.json": '{"image":"occluders-dusk.png"}',
  "occluders-night.png": "night image",
  "occluders-night.json": '{"image":"occluders-night.png"}',
  "characters/index.json": '{"codex":["a"]}',
  "characters/codex-a.png": "character image",
  "characters/codex-a.json": '{"image":"codex-a.png"}',
  "characters/extra/outfit.png": "nested image",
  "characters/extra/outfit.json": "{}",
};

function fixture(files = Object.entries(media)) {
  const root = mkdtempSync(join(tmpdir(), "idesk-m40-assets-"));
  roots.push(root);
  for (const [file, bytes] of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), bytes);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
  vi.useRealTimers();
});

test("keeps the same version across time, roots and reversed directory enumeration", () => {
  vi.useFakeTimers();
  const forward = fixture();
  const reverse = fixture(Object.entries(media).reverse());
  const version = officeAssetVersion(forward);
  expect(officeAssetVersion(forward)).toBe(version);
  expect(officeAssetVersion(reverse)).toBe(version);
  const entries = readdirSync(forward, { recursive: true, withFileTypes: true });
  vi.mocked(readdirSync).mockReturnValueOnce(entries.toReversed());
  expect(officeAssetVersion(forward)).toBe(version);
  vi.setSystemTime(Date.now() + 60_000);
  expect(officeAssetVersion(forward)).toBe(version);
});

test.each(Object.keys(media))("changes the version when %s bytes change", (file) => {
  const root = fixture();
  const before = officeAssetVersion(root);
  writeFileSync(join(root, file), Buffer.from([255, 0, 254]));
  expect(officeAssetVersion(root)).not.toBe(before);
});

test.each(["add", "remove", "rename"])("changes the version after a managed file %s", (change) => {
  const root = fixture();
  const before = officeAssetVersion(root);
  if (change === "add") writeFileSync(join(root, "characters/added.png"), "added image");
  if (change === "remove") rmSync(join(root, "characters/codex-a.png"));
  if (change === "rename")
    renameSync(join(root, "characters/codex-a.png"), join(root, "characters/renamed.png"));
  expect(officeAssetVersion(root)).not.toBe(before);
});

test("ignores layout, font and unrelated public files", () => {
  const root = fixture();
  const before = officeAssetVersion(root);
  for (const file of ["layout.json", "fonts/pixel.woff2", "fonts/preview.png", "unrelated.png"]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), "original");
    expect(officeAssetVersion(root)).toBe(before);
    writeFileSync(join(root, file), "changed");
    expect(officeAssetVersion(root)).toBe(before);
    rmSync(join(root, file));
    expect(officeAssetVersion(root)).toBe(before);
  }
});
