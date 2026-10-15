import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { spriteCells } from "./sprite-cells.mjs";

const kinds = ["claude-code", "codex", "n8n", "script", "custom"];
const directions = ["down", "left", "right", "up"];
const root = fileURLToPath(new URL("../", import.meta.url));
const frameWidth = 64;
const frameHeight = 96;
const atlas = new PNG({ width: frameWidth * 25, height: frameHeight * kinds.length });
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
  const walking = directions.flatMap((direction) =>
    [0, 1, 2, 3].map((frame) => `${kind}/walk/${direction}/${frame}`),
  );
  const seated = (direction) => [
    `${kind}/sit/${direction}`,
    `${kind}/typing/${direction}/0`,
    `${kind}/typing/${direction}/1`,
  ];
  const original = PNG.sync.read(readFileSync(`${root}assets/raw/${kind}.png`));
  const supplement = PNG.sync.read(readFileSync(`${root}assets/raw/${kind}-seated.png`));
  const cells = [
    ...spriteCells(original, 5, [...walking, ...seated("right")], kind),
    ...spriteCells(supplement, 2, [...seated("front"), ...seated("back")], kind),
  ];

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
  for (const direction of ["right", "front", "back"]) {
    const name = `${kind}/typing/${direction}`;
    animations[name] = [0, 1].map((frame) => `${name}/${frame}`);
  }
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
