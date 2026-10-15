import assert from "node:assert/strict";
import { isMagenta } from "./character-edges.mjs";
import { cleanIsolated } from "./furniture.mjs";

export function repairCharacterInterior(png, colors) {
  let selected = new Set();
  for (let p = 0; p < png.data.length; p += 4)
    if (png.data[p + 3] && isMagenta([...png.data.subarray(p, p + 3)])) selected.add(p);
  const count = selected.size;
  while (selected.size) {
    cleanIsolated(png, colors[0], selected, colors);
    const remaining = new Set(
      [...selected].filter((p) => isMagenta([...png.data.subarray(p, p + 3)])),
    );
    assert.ok(remaining.size < selected.size, "内部品红污染无法按四邻域多数色替换");
    selected = remaining;
  }
  return count;
}
