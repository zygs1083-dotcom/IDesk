import { expect, test } from "vitest";
import { entriesText, parseEntries } from "./entry-text.ts";

test("headers preserve colons in values and ignore blank or incomplete lines", () => {
  expect(
    parseEntries(" Link: https://example.com\n\nunfinished\n: empty\nX: first\nX: last", ":"),
  ).toEqual({ Link: "https://example.com", X: "last" });
});
test("parameters preserve equals and empty values", () => {
  expect(parseEntries("token=a=b\nempty=\nmissing", "=")).toEqual({ token: "a=b", empty: "" });
});
test.each([":" as const, "=" as const])("entries round trip with %s", (separator) => {
  const entries = { token: "a=b:c", empty: "" };
  expect(parseEntries(entriesText(entries, separator), separator)).toEqual(entries);
});
