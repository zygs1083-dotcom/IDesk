import { resolve } from "node:path";
import { inClearance, seatApproaches } from "@idesk/shared/office-clearance";
import { parseOfficeLayout } from "@idesk/shared/office-layout";
import { atlas, sprites } from "./character-atlases.mjs";
import { readJson, root, saveJson } from "./occluder-image.mjs";
import { walkingBounds } from "./walking-silhouette.mjs";

const layout = parseOfficeLayout(readJson(`${root}public/layout.json`));
const { clearance, ...silhouette } = walkingBounds(atlas, sprites);
layout.grid.clearance = clearance;
layout.grid.silhouette = silhouette;
const approaches = seatApproaches(layout);
const west = [7, 7, 7, 6, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1];
function wall(x, y) {
  if (y < 7 || (y === 7 && x < 77)) return true;
  if (y >= 8 && y < 13 && x < 33) return true;
  if (y === 8 && x >= 71 && x < 77) return true;
  if (y >= 13 && y <= 38 && x < west[y - 13]) return true;
  if (y < 26 && x >= (y < 11 ? 101 : y < 16 ? 102 : y < 21 ? 103 : 104)) return true;
  if (y === 13 && x >= 13 && x < 27) return true;
  if (y >= 45 && y <= 52 && x >= 82 && (x < 89 || x >= 96)) return true;
  return y >= 51 && x >= 81 && x < 83;
}
const rows = Array.from({ length: Math.ceil(layout.size.h / 16) }, (_, y) =>
  Array.from({ length: Math.ceil(layout.size.w / 16) }, (_, x) => {
    const point = {
      x: Math.min(layout.size.w - 0.5, x * 16 + 8),
      y: Math.min(layout.size.h - 0.5, y * 16 + 8),
    };
    return wall(x, y) || (inClearance(point, layout) && !approaches.has(`${x},${y}`)) ? "#" : ".";
  }).join(""),
);
let narrowed = true;
while (narrowed) {
  narrowed = false;
  const blocked = [];
  for (const [y, row] of rows.entries())
    for (const [x, cell] of [...row].entries())
      if (
        cell === "." &&
        !approaches.has(`${x},${y}`) &&
        ((row[x - 1] === "#" && row[x + 1] === "#") ||
          (rows[y - 1]?.[x] === "#" && rows[y + 1]?.[x] === "#"))
      )
        blocked.push({ x, y });
  for (const { x, y } of blocked) {
    rows[y] = `${rows[y].slice(0, x)}#${rows[y].slice(x + 1)}`;
    narrowed = true;
  }
}
if (!process.argv[2]) throw new Error("Usage: node tools/occluder-grid.mjs OUTPUT.json");
saveJson(resolve(process.argv[2]), { cell: 16, clearance, silhouette, rows });
process.stdout.write(`Grid: ${resolve(process.argv[2])}\n`);
