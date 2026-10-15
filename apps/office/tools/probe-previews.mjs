import { PNG } from "pngjs";
import { palette, verify } from "./furniture.mjs";
import { paste, readJson, readPng, resize, savePng } from "./furniture-image.mjs";

export function renderPreviews(characters, frames, colors = palette()) {
  const ruler = new PNG({ width: 320, height: 128 });
  for (let y = 0; y < ruler.height; y++) {
    for (let x = 0; x < ruler.width; x++)
      ruler.data.set(
        [...colors[x % 32 === 0 || y % 32 === 0 ? 8 : 6], 255],
        (y * ruler.width + x) * 4,
      );
  }
  paste(ruler, characters.standing, 0, 0);
  paste(ruler, characters["sit/down"], 64, 0);
  paste(ruler, frames["desk-laptop"], 144, 96 - frames["desk-laptop"].height);
  for (const suffix of ["behind", "front"])
    paste(ruler, frames[`chair-down-${suffix}`], 240, 96 - frames[`chair-down-${suffix}`].height);
  verify(ruler, colors);
  savePng("assets/probe/ruler@3x.png", resize(ruler, 960, 384));
  const paletteImage = readPng("assets/palette.png");
  savePng("assets/probe/palette@12x.png", resize(paletteImage, paletteImage.width * 12, 12));
  const side = new PNG({ width: 256, height: 128 });
  for (let p = 0; p < side.data.length; p += 4) side.data.set([...colors[6], 255], p);
  for (const [i, facing] of ["left", "right"].entries()) {
    for (const occupied of [false, true]) {
      const chair = readJson("public/catalog.json").items[`chair-${facing}`];
      const x = i * 128 + (occupied ? 64 : 0);
      const parts = chair.parts.map((p) => ({
        ...p,
        png: frames[p.frame],
        x: x + 16 + p.dx,
        y: 80 + p.dy,
      }));
      if (occupied)
        parts.push({
          sortY: chair.seat.y,
          bias: 0,
          png: characters[`sit/${facing}`],
          x: x + chair.seat.x - 16,
          y: 80 + chair.seat.y - 96,
        });
      for (const p of parts.sort((a, b) => a.sortY - b.sortY || a.bias - b.bias))
        paste(side, p.png, p.x, p.y);
    }
  }
  verify(side, colors);
  savePng("assets/probe/side-chairs@3x.png", resize(side, 768, 384));
}

export function composeObjects(canvas, list) {
  const wall = list.filter((part) => part.layer === "wall");
  const sorted = list
    .filter((part) => part.layer !== "wall")
    .sort((a, b) => a.sortY - b.sortY || a.bias - b.bias);
  for (const part of [...wall, ...sorted]) paste(canvas, part.png, part.x, part.y);
}
