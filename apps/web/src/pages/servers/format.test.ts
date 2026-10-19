import { describe, expect, it } from "vitest";
import { bytes, niceMax, percent, rate, uptime } from "./format.ts";

describe("server formatting", () => {
  it("uses binary units and one decimal", () => {
    expect(bytes(1024 ** 3 * 1.5)).toBe("1.5 GiB");
    expect(rate(1536)).toBe("1.5 KiB/s");
    expect(percent(9, 10)).toBe(90);
  });

  it("formats uptime and readable chart bounds", () => {
    expect(uptime(3 * 86400 + 4 * 3600, "zh")).toBe("3 天 4 小时");
    expect(niceMax(173)).toBe(200);
  });
});
