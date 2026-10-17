import { afterEach, expect, test } from "vitest";
import { localDateTime } from "./local-date-time.ts";

const timezone = process.env.TZ;
afterEach(() => {
  process.env.TZ = timezone;
});
test.each(["Asia/Shanghai", "America/New_York", "UTC"])(
  "deadline round trips local input in %s",
  (zone) => {
    process.env.TZ = zone;
    const iso = "2030-06-01T12:34:56.123Z";
    expect(new Date(localDateTime(iso)).toISOString()).toBe(iso);
    expect(localDateTime(null)).toBe("");
  },
);
