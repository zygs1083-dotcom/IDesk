import {
  chromatic,
  rgbDistanceSquared as distance,
  hue,
  hueChoices,
  hueDistance,
} from "./character-hue.mjs";
import { nearest } from "./furniture.mjs";

export function refineSignatures(colors, added, signatures, points) {
  const base = colors.slice(0, 36);
  const angles = base.map(hue);
  const risk = points
    .filter(({ rgb }) => {
      if (!chromatic(rgb)) return false;
      const angle = hue(rgb);
      return (
        !angles.some((a) => Math.min(Math.abs(a - angle), 360 - Math.abs(a - angle)) <= 20) &&
        distance(rgb, nearest(rgb, base)) > 400
      );
    })
    .map((point) => ({ ...point, angle: hue(point.rgb) }));
  for (const [i, entry] of added.entries()) {
    const sources = signatures.filter((s) => entry.source.includes(`${s.kind}/${s.garment}`));
    const remaining = colors.filter((_, j) => j !== 36 + i);
    const missing = risk.filter(
      ({ rgb }) =>
        hueChoices(rgb, remaining) === remaining && distance(rgb, nearest(rgb, remaining)) > 400,
    );
    const region = sources
      .flatMap((s) => s.region)
      .map((point) => {
        const choices = hueChoices(point.rgb, remaining);
        return {
          ...point,
          angle: hue(point.rgb),
          chromatic: chromatic(point.rgb),
          matched: choices !== remaining,
          error: distance(point.rgb, nearest(point.rgb, choices)),
        };
      });
    const center = entry.rgb;
    let best;
    for (let r = -20; r <= 20; r += 4)
      for (let g = -20; g <= 20; g += 4)
        for (let b = -20; b <= 20; b += 4) {
          const rgb = center.map((v, j) => v + [r, g, b][j]);
          if (
            rgb.some((v) => v < 0 || v > 255) ||
            sources.some((s) => distance(s.rgb, rgb) > 400 || hueDistance(s.rgb, rgb) > 20)
          )
            continue;
          const angle = hue(rgb);
          let missed = 0;
          for (const p of missing) {
            const delta = Math.abs(p.angle - angle);
            if (Math.min(delta, 360 - delta) > 20 && distance(p.rgb, rgb) > 400) missed += p.weight;
          }
          let error = 0;
          for (const p of region) {
            const d = distance(p.rgb, rgb);
            const delta = Math.abs(p.angle - angle);
            const matches = p.chromatic && Math.min(delta, 360 - delta) <= 20;
            const value = matches
              ? p.matched
                ? Math.min(d, p.error)
                : d
              : p.chromatic && p.matched
                ? p.error
                : Math.min(d, p.error);
            error += p.weight * value;
          }
          if (!best || missed < best.missed || (missed === best.missed && error < best.error))
            best = { rgb, missed, error };
        }
    entry.center = center;
    entry.rgb = best.rgb;
    colors[36 + i] = best.rgb;
  }
}
