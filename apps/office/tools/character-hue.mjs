export function hue(rgb) {
  const [r, g, b] = rgb;
  const top = Math.max(...rgb);
  const delta = top - Math.min(...rgb);
  if (delta === 0) return 0;
  return (
    ((top === r ? (g - b) / delta : top === g ? 2 + (b - r) / delta : 4 + (r - g) / delta) * 60 +
      360) %
    360
  );
}
export function hueDistance(a, b) {
  const d = Math.abs(hue(a) - hue(b));
  return Math.min(d, 360 - d);
}

export function chromatic(rgb) {
  const top = Math.max(...rgb);
  return top >= 51 && (top - Math.min(...rgb)) / top >= 0.15;
}

export function hueChoices(rgb, colors) {
  if (!chromatic(rgb)) return colors;
  const choices = colors.filter((color) => hueDistance(rgb, color) <= 20);
  return choices.length ? choices : colors;
}

export function rgbDistanceSquared(a, b) {
  return a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0);
}
