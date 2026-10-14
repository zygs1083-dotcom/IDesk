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
    { name: "name", type: "text", required: false },
    { name: "baseUrl", type: "url", required: true },
    { name: "apiKey", type: "password", required: true },
    { name: "accessToken", type: "password", required: false },
    { name: "secret", type: "password", required: false },
    { name: "password", type: "password", required: false },
    { name: "interval", type: "number", required: false },
    { name: "count", type: "number", required: false },
    { name: "enabled", type: "boolean", required: true },
  ]);
  expect(configFields({})).toEqual([]);
});
