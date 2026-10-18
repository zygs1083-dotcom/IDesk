import { expect, test } from "vitest";
import { assignOutfits } from "./outfits.ts";

test("groups by kind, sorts ULIDs and cycles through available outfits", () => {
  const agents = [
    { id: "03", kind: "codex" },
    { id: "01", kind: "codex" },
    { id: "04", kind: "codex" },
    { id: "02", kind: "claude-code" },
  ] as const;
  expect(assignOutfits([...agents], { codex: ["a", "b"], "claude-code": ["a"] })).toEqual(
    new Map([
      ["01", "codex-a"],
      ["02", "claude-code-a"],
      ["03", "codex-b"],
      ["04", "codex-a"],
    ]),
  );
});

test("missing and empty kinds borrow custom independently", () => {
  expect(
    assignOutfits(
      [
        { id: "01", kind: "gemini" },
        { id: "02", kind: "cursor" },
        { id: "03", kind: "gemini" },
        { id: "04", kind: "custom" },
      ],
      { custom: ["a", "c"], cursor: [] },
    ),
  ).toEqual(
    new Map([
      ["01", "custom-a"],
      ["02", "custom-a"],
      ["03", "custom-c"],
      ["04", "custom-a"],
    ]),
  );
});

test("deletion reassigns the remaining members", () => {
  const agents = [
    { id: "01", kind: "codex" },
    { id: "02", kind: "codex" },
  ] as const;
  const index = { codex: ["a", "b", "c"] };
  expect(assignOutfits([...agents], index).get("02")).toBe("codex-b");
  expect(assignOutfits([agents[1]], index).get("02")).toBe("codex-a");
});
