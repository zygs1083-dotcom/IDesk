import { expect, test } from "vitest";
import { labels } from "./labels.ts";

test("Chinese labels preserve task and relay wording", () => {
  const value = labels("zh");
  expect([value.status.open, value.status.in_progress, value.status.cancelled]).toEqual([
    "待领取",
    "进行中",
    "已取消",
  ]);
  expect([value.priority.low, value.priority.urgent]).toEqual(["低", "紧急"]);
  expect([value.relayKind.note, value.relayKind.deliverable]).toEqual(["说明", "成果"]);
  expect([value.action.handoff, value.action.cancel_recruit]).toEqual(["交接", "取消招募"]);
});
