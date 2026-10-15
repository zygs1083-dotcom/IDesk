import { readPng } from "./furniture-image.mjs";
import { spriteCells } from "./sprite-cells.mjs";

const cream = ([r, g, b]) => r > 180 && g > 170 && b > 140 && r - b < 65;
const teal = ([r, g, b]) => g > r * 1.5 && b > r * 1.5 && g > b * 0.8;
const wardrobe = {
  "claude-code": [
    ["hoodie", teal],
    [
      "trousers",
      ([r, g, b]) =>
        Math.min(r, g, b) >= 24 &&
        Math.max(r, g, b) < 90 &&
        Math.max(r, g, b) - Math.min(r, g, b) <= 10,
    ],
  ],
  codex: [
    ["shirt", cream],
    ["trousers", ([r, g, b]) => b > r * 1.15 && b > g * 1.05 && b < 110],
  ],
  n8n: [
    ["vest", ([r, g, b]) => r > 160 && g > 65 && g < 160 && b < 80],
    ["sleeves", cream],
  ],
  script: [
    ["cap", ([r, g, b]) => b > r * 1.5 && b > g * 1.3 && b > 100],
    ["shirt", ([r, g, b]) => r > 170 && g > 120 && b < 90],
  ],
  custom: [
    ["sweater", ([r, g, b]) => r > 65 && r > g * 1.5 && b > g * 1.3 && r > b * 1.1],
    ["trousers", ([r, g, b]) => r > 130 && g > 110 && b > 65 && r / g < 1.4 && g / b > 1.1],
  ],
  receptionist: [
    ["blazer", ([r, g, b]) => b > r * 1.2 && b > g * 1.03 && b < 130],
    ["scarf", ([r, g, b]) => r > 150 && g < 100 && b < 95 && r > g * 2 && r > b * 2],
  ],
};

export function characterColors() {
  const points = new Map();
  const candidates = [];
  const greys = new Map();
  for (const [kind, clothing] of Object.entries(wardrobe)) {
    const garments = [
      ...clothing,
      ["brown", ([r, g, b], y) => y >= 0.5 && r > 45 && r < 180 && r > g * 1.25 && g > b * 1.15],
    ];
    const regions = garments.map(() => new Map());
    for (const suffix of ["", "-seated", "-seated-front"]) {
      const rows = suffix === "" ? 5 : kind === "receptionist" && suffix === "-seated" ? 1 : 2;
      const count = suffix === "" ? 19 : rows === 1 ? 3 : 6;
      const cells = spriteCells(
        readPng(`assets/raw/${kind}${suffix}.png`),
        rows,
        Array.from({ length: count }, (_, i) => String(i)),
        kind,
      );
      for (const { png } of cells)
        for (let p = 0; p < png.data.length; p += 4) {
          if (png.data[p + 3] < 128) continue;
          const rgb = [...png.data.subarray(p, p + 3)];
          const y = Math.floor(p / 4 / png.width) / png.height;
          const top = Math.max(...rgb);
          if (
            y >= 0.5 &&
            y < 0.9 &&
            top >= 51 &&
            top < 204 &&
            (top - Math.min(...rgb)) / top < 0.15
          ) {
            const value = Math.round(rgb.reduce((sum, channel) => sum + channel, 0) / 3);
            const grey = greys.get(value) ?? { rgb: [value, value, value], weight: 0 };
            grey.weight++;
            greys.set(value, grey);
          }
          const key = String(rgb);
          const point = points.get(key) ?? { rgb, weight: 0 };
          point.weight++;
          points.set(key, point);
          for (const [i, [, includes]] of garments.entries()) {
            if (!includes(rgb, Math.floor(p / 4 / png.width) / png.height)) continue;
            const entry = regions[i].get(key) ?? { rgb, weight: 0 };
            entry.weight++;
            regions[i].set(key, entry);
          }
        }
    }
    for (const [i, [garment]] of garments.entries()) {
      const region = [...regions[i].values()];
      const pixels = region.reduce((sum, point) => sum + point.weight, 0);
      if (!pixels) continue;
      const rgb = [0, 1, 2].map((c) =>
        Math.round(region.reduce((sum, point) => sum + point.rgb[c] * point.weight, 0) / pixels),
      );
      const saturation = (Math.max(...rgb) - Math.min(...rgb)) / Math.max(...rgb);
      const entry = { kind, garment, rgb, pixels, region, saturation };
      candidates.push(entry);
    }
  }
  return {
    points: [...points.values()].sort((a, b) => String(a.rgb).localeCompare(String(b.rgb))),
    candidates,
    greys: [...greys.values()].sort((a, b) => a.rgb[0] - b.rgb[0]),
  };
}
