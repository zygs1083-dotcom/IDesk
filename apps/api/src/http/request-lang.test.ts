import { expect, test } from "vitest";
import { requestLang } from "./request-lang.ts";

test.each(["en", "en-US", "EN-gb"])("%s selects English", (header) => {
  expect(requestLang(header)).toBe("en");
});

test.each(["zh-CN", "fr", "", undefined])("%s selects Chinese", (header) => {
  expect(requestLang(header)).toBe("zh");
});
