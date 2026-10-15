import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { colorfulSpecks } from "./character-specks.mjs";
import { readJson, readPng, saveJson } from "./furniture-image.mjs";
import { fallbackPreviews } from "./sprite-fallbacks.mjs";

const { frames } = readJson("public/sprites.json");
const after = readPng("public/sprites.png");
const before = process.argv[2] ? PNG.sync.read(readFileSync(process.argv[2])) : after;
const baseline = {
  "claude-code": 251,
  codex: 102,
  n8n: 231,
  script: 50,
  custom: 54,
  receptionist: 96,
};
const kinds = Object.keys(baseline);
const locations = kinds.map(() => []);
const rows = kinds.map((kind, i) => {
  let count = 0;
  let previous = 0;
  for (const [name, { frame }] of Object.entries(frames)) {
    if (!name.startsWith(`${kind}/`)) continue;
    count += colorfulSpecks(after, frame, locations[i]);
    previous += colorfulSpecks(before, frame);
  }
  return {
    kind,
    baseline: baseline[kind],
    before: previous,
    after: count,
  };
});
fallbackPreviews(before, after, frames, kinds, locations, "specks");
saveJson("assets/probe/front-seating-specks.json", rows);
console.log(JSON.stringify(rows));
