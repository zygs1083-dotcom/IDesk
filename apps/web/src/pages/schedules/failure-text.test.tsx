import { expect, test } from "vitest";
import { translator } from "../../i18n/translate.ts";
import { failureText } from "./failure-text.ts";

const schedule = { id: "schedule-id", name: "Current name" };
const ts = "2026-10-28T03:04:05.006Z";
const t = translator("en");
const values = (text: string) =>
  text
    .split("\n")
    .slice(0, 7)
    .map((line) => line.slice(line.indexOf(": ") + 2));

test("copies only allowed fields, preserving history strings, Unicode, line breaks and zero", () => {
  const error = "  错误 Ω\n  detail\t\n ";
  const payload = {
    name: " 历史 Ω ",
    runId: " run/原串?x=1 ",
    startedAt: ` ${ts} `,
    finishedAt: "2026-10-28T03:04:06+00:00",
    durationMs: 0,
    error,
    status: "failed",
    scheduleId: "wrong-id",
    action: { url: "SECRET_ACTION" },
    unknown: "SECRET_UNKNOWN",
    url: "SECRET_URL",
    config: "SECRET_CONFIG",
    credentials: "SECRET_CREDENTIALS",
  };
  const text = failureText(schedule, { ts, payload }, t);
  expect(values(text)).toEqual([
    payload.name,
    schedule.id,
    payload.runId,
    t("common.failed"),
    payload.startedAt,
    payload.finishedAt,
    "0 ms",
  ]);
  expect(text).toContain(`\n\n${t("automation.errorSummary")}:\n${error}`);
  expect(text).not.toMatch(/SECRET_|wrong-id|\{"/);
});

test.each([undefined, null, false, 7, {}, [], " \n\t"])(
  "uses explicit fallbacks for missing or non-string fields: %j",
  (value) => {
    const payload = {
      name: value,
      runId: value,
      startedAt: value,
      finishedAt: value,
      error: value,
      durationMs: "0",
    };
    const text = failureText(schedule, { ts, payload }, t);
    expect(values(text)).toEqual([
      schedule.name,
      schedule.id,
      "—",
      t("common.failed"),
      "—",
      ts,
      "—",
    ]);
    expect(text.endsWith(`\n${t("schedules.noErrorSummary")}`)).toBe(true);
  },
);
