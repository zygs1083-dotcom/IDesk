import { expect, test } from "vitest";

const sheets = import.meta.glob<{ frames: Record<string, object> }>(
  "../../public/characters/*.json",
  { eager: true, import: "default" },
);

test("agent and receptionist layouts provide the expected poses", () => {
  const names = Object.values(sheets).flatMap((sheet) => Object.keys(sheet.frames ?? {}));
  for (const kind of [
    "claude-code-a",
    "codex-a",
    "n8n-a",
    "script-a",
    "custom-a",
    "receptionist",
  ]) {
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
