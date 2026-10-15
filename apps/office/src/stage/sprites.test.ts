import { expect, test } from "vitest";
import atlas from "../../public/sprites.json";

test("agent and receptionist layouts provide the expected poses", () => {
  const names = Object.keys(atlas.frames);
  for (const kind of ["claude-code", "codex", "n8n", "script", "custom", "receptionist"]) {
    expect(names.filter((name) => name.startsWith(`${kind}/`))).toHaveLength(25);
    for (const direction of ["right", "down", "up"]) {
      expect(names).toContain(`${kind}/sit/${direction}`);
      for (const frame of [0, 1]) expect(names).toContain(`${kind}/typing/${direction}/${frame}`);
    }
  }
});
