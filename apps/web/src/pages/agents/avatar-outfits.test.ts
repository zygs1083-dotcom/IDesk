import { expect, test } from "vitest";
import officeIndex from "../../../../office/public/characters/index.json";
import { assignOutfits } from "../../../../office/src/stage/outfits.ts";
import avatarIndex from "./avatar-index.json";
import { assignAvatarOutfits } from "./avatar-outfits.ts";

test("assigns appearances in ULID order within each kind", () => {
  const outfits = assignAvatarOutfits([
    { id: "04", kind: "codex" },
    { id: "03", kind: "gemini" },
    { id: "02", kind: "codex" },
    { id: "01", kind: "codex" },
    { id: "05", kind: "codex" },
  ]);
  expect(avatarIndex).toEqual(officeIndex);
  expect(outfits).toEqual(
    assignOutfits(
      [
        { id: "04", kind: "codex" },
        { id: "03", kind: "gemini" },
        { id: "02", kind: "codex" },
        { id: "01", kind: "codex" },
        { id: "05", kind: "codex" },
      ],
      officeIndex,
    ),
  );
  expect([...outfits]).toEqual([
    ["01", "codex-a"],
    ["02", "codex-b"],
    ["03", "gemini-a"],
    ["04", "codex-c"],
    ["05", "codex-a"],
  ]);
});

test("kinds without artwork borrow custom outfits independently", () => {
  const agents = [
    { id: "01", kind: "codex" },
    { id: "02", kind: "gemini" },
    { id: "03", kind: "codex" },
  ] as const;
  const index = { custom: ["a", "c"], gemini: [] };
  expect(assignAvatarOutfits([...agents], index)).toEqual(assignOutfits([...agents], index));
});
