import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { PNG } = createRequire(resolve(process.argv[2]))("pngjs");
for (const name of ["tiles", "furniture", "sprites"]) {
  const before = PNG.sync.read(readFileSync(new URL(`atlases-before/${name}.png`, import.meta.url)));
  const after = PNG.sync.read(readFileSync(new URL(`atlases-after/${name}.png`, import.meta.url)));
  assert.equal(before.width, after.width);
  assert.equal(before.height, after.height);
  assert.deepEqual(before.data, after.data);
  for (const png of [before, after]) {
    for (let p = 0; p < png.data.length; p += 4) {
      if (png.data[p + 3] === 0) assert.equal(png.data.readUInt32BE(p), 0);
    }
  }
}
process.stdout.write("All three atlas pairs: RGBA differences 0; nonzero transparent RGB 0\n");
