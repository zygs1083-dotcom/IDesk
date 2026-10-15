import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";
import { PNG } from "pngjs";
import { root } from "./furniture-image.mjs";

function chunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}

export function saveIndexedPng(path, png, colors) {
  assert.equal(colors.length, 42, "expected the shared 42-color palette");
  const indices = new Map(colors.map(([r, g, b], i) => [(r << 16) | (g << 8) | b, i]));
  const transparent = colors.length;
  const rows = Buffer.alloc((png.width + 1) * png.height);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const p = (y * png.width + x) * 4;
      const alpha = png.data[p + 3];
      assert.ok(alpha === 0 || alpha === 255, "half-transparent pixel");
      const rgb = (png.data[p] << 16) | (png.data[p + 1] << 8) | png.data[p + 2];
      if (alpha === 0) assert.equal(rgb, 0, "transparent RGB must be zero");
      const index = alpha === 0 ? transparent : indices.get(rgb);
      assert.notEqual(index, undefined, "opaque color outside palette");
      rows[y * (png.width + 1) + x + 1] = index;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(png.width);
  header.writeUInt32BE(png.height, 4);
  header[8] = 8;
  header[9] = 3;
  const alpha = Buffer.alloc(colors.length + 1, 255);
  alpha[transparent] = 0;
  const encoded = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("PLTE", Buffer.from([...colors.flat(), 0, 0, 0])),
    chunk("tRNS", alpha),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  assert.deepEqual(PNG.sync.read(encoded).data, png.data, "indexed PNG RGBA round trip");
  writeFileSync(`${root}${path}`, encoded);
}
