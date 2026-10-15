import { expect, test } from "vitest";
import { en, message, zh } from "./messages.ts";

test("message dictionaries have matching keys", () => {
  expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
});

test("parameterized messages preserve user data and localize labels", () => {
  for (const [lang, notAllowed, missing, blocked, dependency] of [
    [
      "zh",
      "已完成的任务不能领取",
      "能力不匹配：缺少 gpu、coding",
      "被「用户任务」阻塞",
      "依赖的任务不存在：task-id",
    ],
    [
      "en",
      "Cannot claim a task that is Done",
      "Missing capabilities: gpu, coding",
      "Blocked by “用户任务”",
      "Dependency task not found: task-id",
    ],
  ] as const) {
    expect(message(lang, "transition.notAllowed", { status: "done", action: "claim" })).toBe(
      notAllowed,
    );
    expect(message(lang, "transition.missingCapabilities", { missing: ["gpu", "coding"] })).toBe(
      missing,
    );
    expect(message(lang, "transition.blocked", { title: "用户任务" })).toBe(blocked);
    expect(message(lang, "task.dependencyNotFound", { id: "task-id" })).toBe(dependency);
    expect(message(lang, "validation", { text: "校验失败" })).toBe("校验失败");
  }
});
