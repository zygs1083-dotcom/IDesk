import { expect, test } from "vitest";
import atlas from "../../public/characters.json";

test("agent and receptionist layouts provide the expected poses", () => {
  const names = Object.keys(atlas.frames);
  for (const kind of ["claude-code", "codex", "n8n", "script", "custom", "receptionist"]) {
    expect(names.filter((name) => name.startsWith(`${kind}/`))).toHaveLength(
      kind === "receptionist" ? 22 : 25,
    );
    for (const direction of kind === "receptionist"
      ? ["right", "down"]
      : ["right", "front", "back"]) {
      expect(names).toContain(`${kind}/sit/${direction}`);
      for (const frame of [0, 1]) expect(names).toContain(`${kind}/typing/${direction}/${frame}`);
    }
  }
});
