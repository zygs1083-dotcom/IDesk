import { expect, test } from "vitest";
import { format, initialLang } from "./format.ts";

test("formats multiple and repeated placeholders", () => {
  expect(format("{name} has {count}: {name}", { name: "Codex", count: 3 })).toBe(
    "Codex has 3: Codex",
  );
});

test("preserves templates without parameters", () => {
  expect(format("Hello {name}")).toBe("Hello {name}");
  expect(format("Hello")).toBe("Hello");
});

test.each([
  ["zh", "en-US", "zh"],
  ["en", "zh-CN", "en"],
  [null, "zh-TW", "zh"],
  [null, "en-US", "en"],
  [null, "fr", "en"],
  ["invalid", "zh-CN", "zh"],
])("initial language from %s and %s", (stored, browser, expected) => {
  expect(initialLang(stored, browser as string)).toBe(expected);
});
