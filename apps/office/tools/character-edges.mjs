import { hue } from "./character-hue.mjs";
import { crop } from "./furniture-image.mjs";

export function isMagenta(rgb, minimum = 51) {
  const top = Math.max(...rgb);
  const saturation = (top - Math.min(...rgb)) / top;
  const angle = hue(rgb);
  return top >= minimum && saturation >= 0.15 && angle >= 260 && angle <= 320;
}

export function characterFringe(png, minimum = 51, diagonal = true) {
  const edge = [];
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const p = (y * png.width + x) * 4;
      if (!png.data[p + 3]) continue;
      const rgb = [...png.data.subarray(p, p + 3)];
      if (!isMagenta(rgb, minimum)) continue;
      const transparent = [-1, 0, 1].some((dy) =>
        [-1, 0, 1].some((dx) => {
          if (!diagonal && dx && dy) return false;
          const nx = x + dx;
          const ny = y + dy;
          return (
            nx < 0 ||
            ny < 0 ||
            nx >= png.width ||
            ny >= png.height ||
            !png.data[(ny * png.width + nx) * 4 + 3]
          );
        }),
      );
      if (transparent) edge.push(p);
    }
  }
  return edge;
}

export function removeCharacterFringe(
  png,
  { minimum = 51, diagonal = true, rounds = Infinity } = {},
) {
  const removed = { total: 0, rounds: [], valueBands: [0, 0, 0], remaining: 0 };
  let edge = characterFringe(png, minimum, diagonal);
  for (let i = 0; i < rounds && edge.length; i++) {
    removed.rounds.push(edge.length);
    for (const p of edge) {
      const value = Math.max(...png.data.subarray(p, p + 3));
      removed.valueBands[value < 51 ? 0 : value < 77 ? 1 : 2]++;
      png.data.fill(0, p, p + 4);
    }
    removed.total += edge.length;
    edge = characterFringe(png, minimum, diagonal);
  }
  removed.remaining = edge.length;
  return removed;
}

export function measureCharacterCleanup(png) {
  const copy = () => crop(png, { x: 0, y: 0, w: png.width, h: png.height });
  const before = png.data.reduce((sum, value, i) => sum + (i % 4 === 3 && value >= 128), 0);
  const unbounded = removeCharacterFringe(copy(), { minimum: 0, rounds: Infinity });
  const fourNeighbor = removeCharacterFringe(copy(), { diagonal: false, rounds: 2 });
  const twoRounds = removeCharacterFringe(copy(), { rounds: 2 });
  const current = removeCharacterFringe(png);
  return { before, unbounded, fourNeighbor, twoRounds, current };
}

export function cleanupTotals(rows, kind) {
  const before = rows.reduce((sum, row) => sum + row.before, 0);
  const reports = {};
  for (const name of ["unbounded", "fourNeighbor", "twoRounds", "current"]) {
    const items = rows.map((row) => row[name]);
    reports[name] = {
      total: items.reduce((sum, row) => sum + row.total, 0),
      remaining: items.reduce((sum, row) => sum + row.remaining, 0),
      rounds: Object.fromEntries(
        Array.from({ length: Math.max(2, ...items.map((row) => row.rounds.length)) }, (_, i) => [
          String(i + 1),
          items.reduce((sum, row) => sum + (row.rounds[i] ?? 0), 0),
        ]),
      ),
      valueBands: [0, 1, 2].map((i) => items.reduce((sum, row) => sum + row.valueBands[i], 0)),
    };
  }
  const removed = reports.current.total;
  return {
    kind,
    before,
    after: before - removed,
    removed,
    remaining: reports.current.remaining,
    loss: removed / before,
    ...reports,
  };
}
