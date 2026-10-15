import { PNG } from "pngjs";
import { crop, paste, resize, saveJson, savePng } from "./furniture-image.mjs";

function mark(png, x, y) {
  for (let i = -1; i <= 8; i++) {
    for (const [dx, dy] of [
      [i, -1],
      [i, 8],
      [-1, i],
      [8, i],
    ]) {
      const px = x + dx;
      const py = y + dy;
      if (px >= 0 && py >= 0 && px < png.width && py < png.height)
        png.data.set([255, 0, 64, 255], (py * png.width + px) * 4);
    }
  }
}

export function fallbackPreviews(before, after, frames, kinds, locations) {
  const names = new Map(
    Object.entries(frames).map(([name, { frame }]) => [`${frame.x},${frame.y}`, name]),
  );
  const index = {};
  for (const [row, kind] of kinds.entries()) {
    const grouped = new Map();
    for (const point of locations[row]) {
      const x = Math.floor(point.x / 64) * 64;
      const y = row * 96;
      const frame = names.get(`${x},${y}`);
      const entry = grouped.get(frame) ?? { frame, x, y, points: [] };
      entry.points.push({ x: point.x - x, y: point.y - y });
      grouped.set(frame, entry);
    }
    if (!grouped.size) {
      const frame = `${kind}/walk/down/0`;
      grouped.set(frame, { frame, x: frames[frame].frame.x, y: row * 96, points: [] });
    }
    const entries = [...grouped.values()]
      .sort((a, b) => a.x - b.x)
      .map((entry) => {
        const left = entry.points.length
          ? Math.max(0, Math.min(...entry.points.map((p) => p.x)) - 5)
          : 0;
        const top = entry.points.length
          ? Math.max(0, Math.min(...entry.points.map((p) => p.y)) - 5)
          : 0;
        const right = entry.points.length
          ? Math.min(64, Math.max(...entry.points.map((p) => p.x)) + 6)
          : 64;
        const bottom = entry.points.length
          ? Math.min(96, Math.max(...entry.points.map((p) => p.y)) + 6)
          : 96;
        return { ...entry, box: { x: left, y: top, w: right - left, h: bottom - top } };
      });
    const cellWidth = Math.max(...entries.map((entry) => entry.box.w * 2 + 2));
    const heights = Array.from({ length: Math.ceil(entries.length / 2) }, (_, i) =>
      Math.max(...entries.slice(i * 2, i * 2 + 2).map((entry) => entry.box.h + 2)),
    );
    const canvas = new PNG({
      width: cellWidth * 2,
      height: heights.reduce((sum, h) => sum + h, 0),
    });
    for (let p = 0; p < canvas.data.length; p += 4) canvas.data.set([246, 233, 206, 255], p);
    const marks = [];
    for (const [i, entry] of entries.entries()) {
      const x = (i % 2) * cellWidth;
      const y = heights.slice(0, Math.floor(i / 2)).reduce((sum, h) => sum + h, 0);
      for (const [version, atlas] of [before, after].entries()) {
        const left = x + version * (entry.box.w + 1);
        paste(
          canvas,
          crop(atlas, { ...entry.box, x: entry.x + entry.box.x, y: entry.y + entry.box.y }),
          left,
          y,
        );
        for (const p of entry.points)
          marks.push({ x: (left + p.x - entry.box.x) * 8, y: (y + p.y - entry.box.y) * 8 });
      }
    }
    const enlarged = resize(canvas, canvas.width * 8, canvas.height * 8);
    for (const p of marks) mark(enlarged, p.x, p.y);
    savePng(`assets/probe/front-seating-fallback-${kind}@8x.png`, enlarged);
    index[kind] = entries.map(({ frame, box, points }) => ({ frame, box, points }));
  }
  saveJson("assets/probe/front-seating-fallback-index.json", index);
}
