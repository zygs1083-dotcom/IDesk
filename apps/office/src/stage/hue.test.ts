import { expect, test } from "vitest";
import { hueOffset } from "./hue.ts";

test("id hue offsets are stable, bounded and distinguish agents", () => {
  const ids = ["agent-a", "agent-b", "claude-123", "codex-456", "", "世界"];
  for (const id of ids) {
    expect(hueOffset(id)).toBe(hueOffset(id));
    expect(hueOffset(id)).toBeGreaterThanOrEqual(-20);
    expect(hueOffset(id)).toBeLessThanOrEqual(20);
  }
  expect(new Set(ids.map(hueOffset)).size).toBeGreaterThan(1);
});
