import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { bounds, resize } from "./furniture-image.mjs";
import { spriteCells } from "./sprite-cells.mjs";

const kinds = ["claude-code", "codex", "n8n", "script", "custom", "receptionist"];
const directions = ["down", "left", "right", "up"];
const root = fileURLToPath(new URL("../", import.meta.url));
const frameWidth = 64;
const frameHeight = 96;
const atlas = new PNG({ width: frameWidth * 25, height: frameHeight * kinds.length });
const frames = {};
const animations = {};

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
  const supplementDirections = kind === "receptionist" ? ["down"] : ["front", "back"];
  const cells = [
    ...spriteCells(original, 5, [...walking, ...seated("right")], kind),
    ...spriteCells(
      supplement,
      supplementDirections.length,
      supplementDirections.flatMap(seated),
      kind,
    ),
  ];

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
    const scaled = resize(common, scaledWidth, scaledHeight);
    // 缩小可能漏掉窄脚尖，再固定实际不透明底边，不改变共用缩放比例。
    const scaledBox = bounds(scaled);
    const occupiedHeight = scaledBox.y + scaledBox.h;
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
  for (const direction of ["right", ...supplementDirections]) {
    const name = `${kind}/typing/${direction}`;
    animations[name] = [0, 1].map((frame) => `${name}/${frame}`);
  }
}

mkdirSync(`${root}public`, { recursive: true });
writeFileSync(`${root}public/characters.png`, PNG.sync.write(atlas));
writeFileSync(
  `${root}public/characters.json`,
  `${JSON.stringify(
    {
      frames,
      animations,
      meta: {
        image: "characters.png",
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
