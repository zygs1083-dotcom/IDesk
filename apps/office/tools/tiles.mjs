import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { palette, verify } from "./furniture.mjs";
import { paste, saveJson } from "./furniture-image.mjs";
import { saveIndexedPng } from "./indexed-png.mjs";

export function drawTile(name, colors) {
  const png = new PNG({ width: 32, height: 32 });
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      let color = 6;
      if (name === "floor/wood") {
        const seam = y % 16 === 0 || y % 16 === 15;
        const end = (x === 0 || x === 31) && y < 16;
        color = seam || end ? 3 : y % 16 === 1 ? 5 : 4;
        if (!seam && !end && y % 8 === 5 && x > 5 && x < 25) color = 3;
      }
      if (name === "floor/carpet") {
        const px = Math.min(x, 31 - x);
        const py = Math.min(y, 31 - y);
        color = (px + py) % 8 === 0 ? 8 : (px - py) % 8 === 0 ? 6 : 7;
      }
      if (name === "floor/tile") color = x === 0 || y === 0 || x === 31 || y === 31 ? 8 : 6;
      if (name === "wall/upper") color = x % 16 === 0 ? 7 : 6;
      if (name === "wall/wainscot") {
        color = y < 10 ? 6 : y < 12 || y > 29 ? 1 : y === 12 ? 5 : x % 16 === 0 ? 3 : 4;
      }
      if (name.startsWith("wall/window")) {
        const wx = x + (name.endsWith("r") ? 32 : 0);
        color =
          wx < 3 || wx > 60 || y < 3 || y > 27 || wx === 31 || wx === 32
            ? 2
            : wx === 3 || y === 3 || y === 28
              ? 5
              : y < 12
                ? 19
                : 18;
        if (y === 15) color = 4;
        if (y > 28) color = y === 29 ? 5 : 2;
      }
      png.data.set([...colors[color], 255], (y * 32 + x) * 4);
    }
  }
  return png;
}

export function assertSeam(png) {
  for (let i = 0; i < 32; i++) {
    const pixel = (x, y) => [...png.data.subarray((y * 32 + x) * 4, (y * 32 + x) * 4 + 4)];
    assert.deepEqual(pixel(0, i), pixel(31, i));
    assert.deepEqual(pixel(i, 0), pixel(i, 31));
  }
}

export function buildTiles() {
  const colors = palette();
  const codes = {
    w: "floor/wood",
    c: "floor/carpet",
    t: "floor/tile",
    U: "wall/upper",
    L: "wall/wainscot",
    N: "wall/window-l",
    O: "wall/window-r",
  };
  const atlas = new PNG({ width: Object.keys(codes).length * 32, height: 32 });
  const frames = {};
  for (const [i, name] of Object.values(codes).entries()) {
    const png = drawTile(name, colors);
    if (name.startsWith("floor/")) assertSeam(png);
    paste(atlas, png, i * 32, 0);
    frames[name] = { x: i * 32, y: 0, w: 32, h: 32 };
  }
  verify(atlas, colors);
  saveIndexedPng("public/tiles.png", atlas, colors);
  saveJson("public/tiles.json", { tile: 32, codes, frames });
  console.log("瓦片 7 帧；地面双轴接边通过；调色板外颜色数 0；半透明像素 0");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) buildTiles();
