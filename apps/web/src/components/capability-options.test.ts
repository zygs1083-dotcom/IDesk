import { expect, test } from "vitest";
import { translator } from "../i18n/translate.ts";
import {
  addCapability,
  availablePresets,
  capabilityCountKey,
  capabilityName,
  capabilityOptions,
  claimableAgents,
  missingCapabilities,
  visibleCapabilities,
} from "./capability-options.ts";

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

test("single selection replaces the previous capability on consecutive additions", () => {
  const first = addCapability([], "coding", "single");
  expect(first).toEqual(["coding"]);
  expect(addCapability(first, "browser", "single")).toEqual(["browser"]);
  expect(addCapability(first, "browser", "multi")).toEqual(["coding", "browser"]);
  expect(addCapability(first, "coding", "multi")).toEqual(["coding"]);
});

test("presets show localized names with the stored value and custom capabilities show only their value", () => {
  expect(capabilityName("coding", "zh")).toEqual({ label: "写代码", detail: "coding" });
  expect(capabilityName("coding", "en")).toEqual({ label: "Coding", detail: "coding" });
  expect(capabilityName("front-end", "zh")).toEqual({ label: "front-end", detail: null });
  expect(capabilityName("front-end", "en")).toEqual({ label: "front-end", detail: null });
});

test("empty focused input offers the complete unselected union; filtering accepts names and values", () => {
  const options = capabilityOptions(fixture, "zh");
  expect(visibleCapabilities(options, [], "")).toEqual(options);
  expect(visibleCapabilities(options, ["coding"], "")).toHaveLength(12);
  expect(visibleCapabilities(options, [], "写代码").map((option) => option.value)).toEqual([
    "coding",
  ]);
  expect(visibleCapabilities(options, [], " CODING ").map((option) => option.value)).toEqual([
    "coding",
  ]);
  expect(visibleCapabilities(options, [], "custom").map((option) => option.value)).toEqual([
    "custom",
  ]);
});

test("quick choices contain only unselected presets and disappear after adding", () => {
  const choices = availablePresets(["coding", "custom"]);
  expect(choices).toHaveLength(11);
  expect(choices.some((preset) => preset.value === "coding" || preset.value === "custom")).toBe(
    false,
  );
  const selected = addCapability(["coding", "custom"], "review", "multi");
  expect(selected).toEqual(["coding", "custom", "review"]);
  expect(availablePresets(selected).map((preset) => preset.value)).not.toContain("review");
});

test.each([0, 1, 2])("English count messages select singular only for one: %s", (count) => {
  const t = translator("en");
  const noun = count === 1 ? "agent" : "agents";
  expect(t(capabilityCountKey("recipients", count), { total: count })).toBe(
    `${count} ${noun} will receive this message`,
  );
  expect(t(capabilityCountKey("online", count), { online: count })).toBe(
    `${count} online ${noun} can claim now`,
  );
  expect(t(capabilityCountKey("offline", count), { total: count })).toBe(
    count === 1
      ? "The 1 agent with these capabilities is offline"
      : `All ${count} agents with these capabilities are offline`,
  );
  expect(translator("zh")(capabilityCountKey("recipients", count), { total: count })).toBe(
    `${count} 个智能体会收到`,
  );
});
