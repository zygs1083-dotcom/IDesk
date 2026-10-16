import { expect, test } from "vitest";
import { capabilitiesSchema, capabilitySchema } from "./capabilities.ts";

test.each([
  ["Coding", "coding"],
  ["  front end  ", "front-end"],
  [" \t Front   \n End \t", "front-end"],
  ["a", "a"],
  ["X".repeat(32), "x".repeat(32)],
])("normalizes %j to %j", (input, expected) => {
  expect(capabilitySchema.parse(input)).toBe(expected);
});

test.each(["", " \t\n ", "a".repeat(33), "coding,browser"])(
  "rejects invalid capability %j",
  (input) => {
    expect(capabilitySchema.safeParse(input).success).toBe(false);
  },
);

test("deduplicates after normalization while preserving order", () => {
  expect(
    capabilitiesSchema.parse(["Coding", " coding ", "Front  End", "front-end", "browser"]),
  ).toEqual(["coding", "front-end", "browser"]);
});

test("read schemas and task filters preserve legacy values", async () => {
  const { taskQuerySchema, taskSchema } = await import("./task-schemas.ts");
  const { publicAgentSchema } = await import("./agent-schemas.ts");
  const { relayMessageSchema } = await import("./relay-schemas.ts");
  const { scheduleSchema } = await import("./schedule-schemas.ts");
  const legacy = [" Legacy Value ", "old,value"];
  expect(publicAgentSchema.shape.capabilities.parse(legacy)).toEqual(legacy);
  expect(taskSchema.shape.capabilities.parse(legacy)).toEqual(legacy);
  expect(taskQuerySchema.parse({ capability: legacy[0] })).toEqual({ capability: legacy[0] });
  expect(relayMessageSchema.shape.to.parse({ kind: "capability", value: legacy[0] })).toEqual({
    kind: "capability",
    value: legacy[0],
  });
  expect(
    scheduleSchema.shape.action.parse({
      type: "publish_task",
      template: { title: "legacy", capabilities: legacy },
    }),
  ).toEqual({ type: "publish_task", template: { title: "legacy", capabilities: legacy } });
});
