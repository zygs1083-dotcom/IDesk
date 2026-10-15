export function worldScale(
  windowWidth: number,
  windowHeight: number,
  worldWidth: number,
  worldHeight: number,
): number {
  const ratio = Math.min(windowWidth / worldWidth, windowHeight / worldHeight);
  return ratio;
}
