import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { crop, paste, readJson, readPng, resize, savePng } from "./furniture-image.mjs";

const before = PNG.sync.read(readFileSync(process.argv[2]));
const after = readPng("public/sprites.png");
const { frames } = readJson("public/sprites.json");
const kinds = [...new Set(Object.keys(frames).map((name) => name.split("/")[0]))];
for (const kind of kinds) {
  const face = new PNG({ width: 128, height: 48 });
  const trousers = new PNG({ width: 96, height: 144 });
  for (const [column, atlas] of [before, after].entries()) {
    const seated = crop(atlas, frames[`${kind}/sit/down`].frame);
    paste(face, crop(seated, { x: 0, y: 12, w: 64, h: 48 }), column * 64, 0);
    for (const [row, pose] of ["walk/down/0", "sit/down", "sit/up"].entries()) {
      const png = crop(atlas, frames[`${kind}/${pose}`].frame);
      paste(trousers, crop(png, { x: 8, y: 48, w: 48, h: 48 }), column * 48, row * 48);
    }
  }
  savePng(`assets/probe/front-seating-revision-face-${kind}@6x.png`, resize(face, 768, 288));
  if (kind === "claude-code" || kind === "n8n")
    savePng(`assets/probe/front-seating-trousers-${kind}@6x.png`, resize(trousers, 576, 864));
}
console.log("返工前后：6种角色脸部与claude/n8n裤子6倍对比，左旧右新");
