import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const kinds = ["claude-code", "codex", "n8n", "script", "custom"];
const directions = ["down", "left", "right", "up"];
const root = fileURLToPath(new URL("../", import.meta.url));
const frameWidth = 64;
const frameHeight = 96;
const fringeThreshold = 40;
const atlas = new PNG({ width: frameWidth * 19, height: frameHeight * kinds.length });
const frames = {};
const animations = {};

function bounds(png) {
  let left = png.width;
  let top = png.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error("精灵帧为空");
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

for (const [kindIndex, kind] of kinds.entries()) {
  const source = PNG.sync.read(readFileSync(`${root}assets/raw/${kind}.png`));
  for (let p = 0; p < source.data.length; p += 4) {
    const distance = Math.hypot(source.data[p] - 255, source.data[p + 1], source.data[p + 2] - 255);
    if (distance <= 60) source.data[p + 3] = 0;
  }
  // 生成图的抗锯齿会留下品红过渡边；邻域使用抠色快照，只去边一遍。
  const alpha = source.data.filter((_, index) => index % 4 === 3);
  const w = source.width;
  for (let pixel = 0; pixel < alpha.length; pixel++) {
    const p = pixel * 4;
    const [r, g, b] = source.data.subarray(p, p + 3);
    if (!alpha[pixel] || r - g <= fringeThreshold || b - g <= fringeThreshold) continue;
    const edge = [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1].some((offset) => {
      const neighbor = pixel + offset;
      if (neighbor < 0 || neighbor >= alpha.length) return false;
      return Math.abs((neighbor % w) - (pixel % w)) <= 1 && alpha[neighbor] === 0;
    });
    if (edge) source.data[p + 3] = 0;
  }
  const columns = Array.from({ length: 5 }, (_, i) => Math.round((i * source.width) / 4));
  const rows = Array.from({ length: 6 }, (_, i) => Math.round((i * source.height) / 5));
  const pixels = Array.from({ length: 20 }, () => []);
  const seen = new Uint8Array(source.width * source.height);
  // 按整图连通区域的质心归格，跨格的头发仍完整属于同一角色。
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || source.data[start * 4 + 3] === 0) continue;
    const region = [start];
    seen[start] = 1;
    let sumX = 0;
    let sumY = 0;
    for (let cursor = 0; cursor < region.length; cursor++) {
      const pixel = region[cursor];
      const x = pixel % source.width;
      const y = Math.floor(pixel / source.width);
      sumX += x;
      sumY += y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx < 0 || x + dx >= source.width || y + dy < 0 || y + dy >= source.height)
            continue;
          const neighbor = (y + dy) * source.width + x + dx;
          if (seen[neighbor] || source.data[neighbor * 4 + 3] === 0) continue;
          seen[neighbor] = 1;
          region.push(neighbor);
        }
      }
    }
    const col = columns.findIndex((edge) => edge > sumX / region.length) - 1;
    const row = rows.findIndex((edge) => edge > sumY / region.length) - 1;
    for (const pixel of region) pixels[row * 4 + col].push(pixel);
  }
  if (pixels[19].length > 10) throw new Error(`${kind} 的留空格含有角色像素`);
  const cells = pixels.slice(0, 19).map((content, index) => {
    if (content.length === 0) throw new Error(`${kind} 第 ${index + 1} 格为空`);
    let left = source.width;
    let top = source.height;
    let right = 0;
    let bottom = 0;
    for (const pixel of content) {
      const x = pixel % source.width;
      const y = Math.floor(pixel / source.width);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
    const png = new PNG({ width: right - left + 1, height: bottom - top + 1 });
    for (const pixel of content) {
      const x = (pixel % source.width) - left;
      const y = Math.floor(pixel / source.width) - top;
      source.data.copy(png.data, (y * png.width + x) * 4, pixel * 4, pixel * 4 + 4);
    }
    const row = Math.floor(index / 4);
    const col = index % 4;
    const name =
      row < 4
        ? `${kind}/walk/${directions[row]}/${col}`
        : col === 0
          ? `${kind}/sit/0`
          : `${kind}/typing/${col - 1}`;
    return { png, box: { x: 0, y: 0, width: png.width, height: png.height }, name };
  });

  // 全部姿态共用同一框和缩放比例，底边固定，避免走路时脚底上下抖动。
  const commonWidth = Math.max(...cells.map(({ box }) => box.width));
  const commonHeight = Math.max(...cells.map(({ box }) => box.height));
  const fit = Math.min(frameWidth / commonWidth, frameHeight / commonHeight);
  const scale = fit >= 1 ? Math.floor(fit) : fit;
  const scaledWidth = Math.round(commonWidth * scale);
  const scaledHeight = Math.round(commonHeight * scale);

  for (const [index, { png, box, name }] of cells.entries()) {
    const common = new PNG({ width: commonWidth, height: commonHeight });
    png.bitblt(
      common,
      box.x,
      box.y,
      box.width,
      box.height,
      Math.floor((commonWidth - box.width) / 2),
      commonHeight - box.height,
    );
    const atlasX = index * frameWidth;
    const atlasY = kindIndex * frameHeight;
    const offsetX = Math.floor((frameWidth - scaledWidth) / 2);
    const scaled = new PNG({ width: scaledWidth, height: scaledHeight });
    for (let y = 0; y < scaledHeight; y++) {
      for (let x = 0; x < scaledWidth; x++) {
        // 从底边取样让包围盒的最后一行在缩小后仍被保留。
        const sourceX = Math.floor(((x + 1) * commonWidth - 1) / scaledWidth);
        const sourceY = Math.floor(((y + 1) * commonHeight - 1) / scaledHeight);
        const from = (sourceY * commonWidth + sourceX) * 4;
        const to = (y * scaledWidth + x) * 4;
        common.data.copy(scaled.data, to, from, from + 4);
      }
    }
    // 缩小可能漏掉窄脚尖，再固定实际不透明底边，不改变共用缩放比例。
    const scaledBox = bounds(scaled);
    const occupiedHeight = scaledBox.y + scaledBox.height;
    scaled.bitblt(
      atlas,
      0,
      0,
      scaledWidth,
      occupiedHeight,
      atlasX + offsetX,
      atlasY + frameHeight - occupiedHeight,
    );
    frames[name] = {
      frame: { x: atlasX, y: atlasY, w: frameWidth, h: frameHeight },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight },
      sourceSize: { w: frameWidth, h: frameHeight },
    };
  }
  for (const direction of directions) {
    const name = `${kind}/walk/${direction}`;
    animations[name] = [0, 1, 2, 3].map((frame) => `${name}/${frame}`);
  }
  animations[`${kind}/typing`] = [0, 1].map((frame) => `${kind}/typing/${frame}`);
}

mkdirSync(`${root}public`, { recursive: true });
writeFileSync(`${root}public/sprites.png`, PNG.sync.write(atlas));
writeFileSync(
  `${root}public/sprites.json`,
  `${JSON.stringify(
    {
      frames,
      animations,
      meta: {
        image: "sprites.png",
        format: "RGBA8888",
        size: { w: atlas.width, h: atlas.height },
        scale: "1",
      },
    },
    null,
    2,
  ).replace(/\[\n(?:\s*"[^"\n]+",?\n)+\s*\]/g, (array, offset, json) => {
    const compact = JSON.stringify(JSON.parse(array)).replaceAll(",", ", ");
    const prefix = json.slice(json.lastIndexOf("\n", offset) + 1, offset);
    return prefix.length + compact.length + 1 <= 100 ? compact : array;
  })}\n`,
);
console.log(`写入 sprites.png（${atlas.width}×${atlas.height}，${Object.keys(frames).length} 帧）`);
