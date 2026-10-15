import { expect, test } from "vitest";
import { ulidAt } from "./replay-time.ts";

test("a fixed ULID timestamp has the minimum possible random suffix", () => {
  const minimum = ulidAt(1469918176385);
  expect(minimum).toBe("01ARYZ6S410000000000000000");
  expect(minimum <= "01ARYZ6S410000000000000000").toBe(true);
  expect(minimum < "01ARYZ6S41ZZZZZZZZZZZZZZZZ").toBe(true);
  expect(ulidAt(0)).toBe("00000000000000000000000000");
});
