import { expect, test } from "vitest";
import { capabilityOptions, claimableAgents, missingCapabilities } from "./capability-options.ts";

const agents = [
  { status: "online", capabilities: ["coding", "browser", "custom", "coding"] },
  { status: "offline", capabilities: ["coding", "gpu"] },
  { status: "online", capabilities: ["browser"] },
] as const;
const fixture = agents.map((agent) => ({ ...agent, capabilities: [...agent.capabilities] }));

test("unites presets and existing values and counts agents once per capability", () => {
  const options = capabilityOptions(fixture, "zh");
  expect(options).toHaveLength(13);
  expect(options.find((option) => option.value === "coding")).toEqual({
    value: "coding",
    label: "写代码",
    total: 2,
    online: 1,
  });
  expect(options.find((option) => option.value === "custom")).toEqual({
    value: "custom",
    label: "custom",
    total: 1,
    online: 1,
  });
  expect(options.find((option) => option.value === "testing")).toMatchObject({
    total: 0,
    online: 0,
  });
  expect(capabilityOptions(fixture, "en").find((option) => option.value === "coding")?.label).toBe(
    "Coding",
  );
  expect(capabilityOptions([], "en")).toHaveLength(12);
});

test.each([
  [[], { state: "any", total: 3, online: 2 }],
  [["coding", "browser"], { state: "online", total: 1, online: 1 }],
  [["coding", "gpu"], { state: "offline", total: 1, online: 0 }],
  [["browser", "gpu"], { state: "none", total: 0, online: 0 }],
])("claimable hints require all capabilities: %j", (required, result) => {
  expect(claimableAgents(required, fixture)).toEqual(result);
});

test("missing capabilities preserve requirement order and compare exact stored values", () => {
  expect(missingCapabilities(["coding", "browser", "gpu"], ["coding"])).toEqual(["browser", "gpu"]);
  expect(missingCapabilities([], [])).toEqual([]);
  expect(missingCapabilities(["coding"], ["Coding"])).toEqual(["coding"]);
});
