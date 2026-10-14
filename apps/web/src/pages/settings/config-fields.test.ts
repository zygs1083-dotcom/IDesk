import { expect, test } from "vitest";
import { configFields } from "./config-fields.ts";

test("top-level fields preserve required flags and select input types", () => {
  expect(
    configFields({
      properties: {
        name: { type: "string" },
        baseUrl: { type: "string", format: "uri" },
        apiKey: { type: "string" },
        accessToken: { type: "string" },
        secret: { type: "string" },
        password: { type: "string", format: "uri" },
        interval: { type: "number" },
        count: { type: "integer" },
        enabled: { type: "boolean" },
        nested: { type: "object" },
        list: { type: "array" },
      },
      required: ["baseUrl", "apiKey", "enabled"],
    }),
  ).toEqual([
    { name: "name", label: "name", type: "text", required: false },
    { name: "baseUrl", label: "baseUrl", type: "url", required: true },
    { name: "apiKey", label: "apiKey", type: "password", required: true },
    { name: "accessToken", label: "accessToken", type: "password", required: false },
    { name: "secret", label: "secret", type: "password", required: false },
    { name: "password", label: "password", type: "password", required: false },
    { name: "interval", label: "interval", type: "number", required: false },
    { name: "count", label: "count", type: "number", required: false },
    { name: "enabled", label: "enabled", type: "boolean", required: true },
  ]);
  expect(configFields({})).toEqual([]);
});

test("schema titles label fields with a key fallback", () => {
  expect(
    configFields({
      properties: { baseUrl: { type: "string", title: "地址" }, apiKey: { type: "string" } },
    }),
  ).toEqual([
    { name: "baseUrl", label: "地址", type: "text", required: false },
    { name: "apiKey", label: "apiKey", type: "password", required: false },
  ]);
});

test("string enums expose select options while retaining their input type", () => {
  expect(
    configFields({ properties: { format: { type: "string", enum: ["text", "json", "csv"] } } }),
  ).toEqual([
    {
      name: "format",
      label: "format",
      type: "text",
      required: false,
      options: ["text", "json", "csv"],
    },
  ]);
});
