import { PNG } from "pngjs";

const fringeThreshold = 40;

export function removeMagenta(source) {
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
}

export function spriteCells(source, rowCount, names, kind) {
  removeMagenta(source);
  const columns = Array.from({ length: 5 }, (_, i) => Math.round((i * source.width) / 4));
  const rows = Array.from({ length: rowCount + 1 }, (_, i) =>
    Math.round((i * source.height) / rowCount),
  );
  const pixels = Array.from({ length: rowCount * 4 }, () => []);
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
  if (pixels.slice(names.length).some((cell) => cell.length > 10))
    throw new Error(`${kind} 的留空格含有角色像素`);
  const cells = pixels.slice(0, names.length).map((content, index) => {
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
    return { png, box: { x: 0, y: 0, width: png.width, height: png.height }, name: names[index] };
  });
  return cells;
}
