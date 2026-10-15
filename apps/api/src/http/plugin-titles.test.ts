import { expect, test } from "vitest";
import { pluginTitles } from "./plugin-titles.ts";

test("field titles localize without changing the schema or exposing titleEn", () => {
  const schema = {
    type: "object" as const,
    properties: {
      url: { type: "string" as const, title: "地址", titleEn: "Address", format: "uri" },
    },
    required: ["url"],
  };
  for (const [lang, title] of [
    ["en", "Address"],
    ["zh", "地址"],
  ] as const) {
    expect(pluginTitles(schema, lang)).toEqual({
      type: "object",
      properties: { url: { type: "string", title, format: "uri" } },
      required: ["url"],
    });
  }
  expect(schema.properties.url).toEqual({
    type: "string",
    title: "地址",
    titleEn: "Address",
    format: "uri",
  });
});
