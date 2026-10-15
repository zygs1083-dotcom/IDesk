import { expect, test } from "vitest";
import { readJson, readPng, root } from "./image.mjs";

const layout = readJson(`${root}public/layout.json`);
const atlas = readJson(`${root}public/characters.json`);
const image = readPng(`${root}public/characters.png`);

test("the whole meeting card remains visible with every seated character and typing frame", () => {
  const hits = [];
  const card = layout.meeting.workSpot;
  for (const seat of layout.seats.filter((seat) => layout.meeting.seats.includes(seat.id))) {
    for (const kind of ["claude-code", "codex", "n8n", "script", "custom"]) {
      for (const pose of [
        `sit/${seat.facing}`,
        `typing/${seat.facing}/0`,
        `typing/${seat.facing}/1`,
      ]) {
        const { frame, anchor } = atlas.frames[`${kind}/${pose}`];
        const left = seat.x - frame.w * anchor.x;
        const top = seat.y - frame.h * anchor.y;
        for (let y = card.y - 11; y <= card.y + 11; y++) {
          for (let x = card.x - 17; x <= card.x + 17; x++) {
            const localX = x - left,
              localY = y - top;
            if (localX < 0 || localY < 0 || localX >= frame.w || localY >= frame.h) continue;
            const pixelX = seat.mirror ? frame.w - 1 - localX : localX;
            const alpha = image.data[((frame.y + localY) * image.width + frame.x + pixelX) * 4 + 3];
            if (alpha) hits.push(`${seat.id}/${kind}/${pose}/${x},${y}`);
          }
        }
      }
    }
  }
  expect(hits).toEqual([]);
});
