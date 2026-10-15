import { resolve } from "node:path";
import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { contains, polygonBounds, readJson, root, saveJson } from "./occluder-image.mjs";

const layout = parseOfficeLayout(readJson(`${root}assets/layout.json`));
const cell = 16;
const rows = Array.from({ length: Math.ceil(layout.size.h / cell) }, (_, y) =>
  Array.from({ length: Math.ceil(layout.size.w / cell) }, (_, x) => {
    const px = Math.min(layout.size.w - 0.5, (x + 0.5) * cell);
    const py = Math.min(layout.size.h - 0.5, (y + 0.5) * cell);
    return layout.occluders.some((item) => {
      const box = polygonBounds(item.polygon);
      return (
        py >= item.baseline - cell &&
        py <= item.baseline &&
        px >= box.x &&
        px < box.x + box.w &&
        contains(item.polygon, px, py)
      );
    })
      ? "#"
      : ".";
  }),
);
for (const p of [
  ...layout.seats,
  ...Object.values(layout.points ?? {}),
  ...(layout.spots ?? []),
  ...(layout.standing ?? []),
])
  rows[Math.floor(p.y / cell)][Math.floor(p.x / cell)] = ".";
if (!process.argv[2]) throw new Error("Usage: node tools/occluder-grid.mjs OUTPUT.json");
saveJson(resolve(process.argv[2]), { cell, rows: rows.map((row) => row.join("")) });
console.log(`Grid draft: ${resolve(process.argv[2])}`);
