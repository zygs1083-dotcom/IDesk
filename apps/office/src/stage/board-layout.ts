export function boardLayout(width: number, height: number, count: number) {
  const columns = Math.floor(width / 21);
  const slots = columns * Math.floor(height / 15);
  const visible = count > slots ? Math.max(0, slots - 1) : count;
  const point = (index: number) => ({
    x: 8 + (index % columns) * 21,
    y: 5 + Math.floor(index / columns) * 15,
  });
  return {
    visible,
    overflow: count - visible,
    point,
    overflowPoint: point(Math.max(0, slots - 1)),
  };
}
