import { expect, test } from "vitest";
import atlas from "../../public/sprites.json";

test("agent and receptionist layouts provide the expected poses", () => {
  const names = Object.keys(atlas.frames);
  for (const kind of ["claude-code", "codex", "n8n", "script", "custom"]) {
    expect(names.filter((name) => name.startsWith(`${kind}/`))).toHaveLength(31);
    for (const direction of ["right", "front", "back", "down", "up"]) {
      expect(names).toContain(`${kind}/sit/${direction}`);
      for (const frame of [0, 1]) expect(names).toContain(`${kind}/typing/${direction}/${frame}`);
    }
  }
  expect(names.filter((name) => name.startsWith("receptionist/"))).toHaveLength(28);
  for (const direction of ["right", "upright", "down", "up"]) {
    expect(names).toContain(`receptionist/sit/${direction}`);
    for (const frame of [0, 1])
      expect(names).toContain(`receptionist/typing/${direction}/${frame}`);
  }
  expect(names).not.toContain("receptionist/sit/front");
  expect(names).not.toContain("receptionist/sit/back");
});
