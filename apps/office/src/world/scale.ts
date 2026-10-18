import type { OfficeLayout } from "@idesk/shared/office-layout";

export type VisibleBounds = { left: number; top: number; right: number; bottom: number };

export function requiredBounds(layout: OfficeLayout): VisibleBounds {
  const clockMargin = 6;
  const seatIds = new Set([
    ...layout.zones.flatMap((zone) => zone.seats),
    ...layout.meeting.seats,
    ...layout.lounge,
    layout.reception.seat,
  ]);
  const seats = layout.seats.filter((seat) => seatIds.has(seat.id));
  const points = [
    ...seats.flatMap((seat) => [seat, seat.workSpot]),
    ...layout.zones.flatMap((zone) => [
      zone.plaque,
      { x: zone.plaque.x + zone.plaque.w, y: zone.plaque.y + zone.plaque.h },
    ]),
    layout.meeting.workSpot,
    layout.reception.counter,
    layout.points.door,
    {
      x: layout.clock.x - layout.clock.r - clockMargin,
      y: layout.clock.y - layout.clock.r - clockMargin,
    },
    {
      x: layout.clock.x + layout.clock.r + clockMargin,
      y: layout.clock.y + layout.clock.r + clockMargin,
    },
  ];
  const polygons = layout.occluders
    .filter((item) => /^(zone-|meeting-|lounge-|reception-)/.test(item.id))
    .flatMap((item) => item.polygon.map(([x, y]) => ({ x, y })));
  const all = [...points, ...polygons];
  return {
    left: Math.min(...all.map((point) => point.x)),
    top: Math.min(...all.map((point) => point.y)),
    right: Math.max(...all.map((point) => point.x)),
    bottom: Math.max(...all.map((point) => point.y)),
  };
}

export function worldScale(
  windowWidth: number,
  windowHeight: number,
  worldWidth: number,
  worldHeight: number,
  required: VisibleBounds,
) {
  const contain = Math.min(windowWidth / worldWidth, windowHeight / worldHeight);
  const cover = Math.max(windowWidth / worldWidth, windowHeight / worldHeight);
  const minWidth =
    Math.max(worldWidth * 0.94, required.right) - Math.min(worldWidth * 0.06, required.left);
  const minHeight =
    Math.max(worldHeight * 0.94, required.bottom) - Math.min(worldHeight * 0.06, required.top);
  const scale = Math.max(
    contain,
    Math.min(cover, windowWidth / minWidth, windowHeight / minHeight),
  );
  const offset = (viewport: number, size: number, near: number, far: number) => {
    const visible = viewport / scale;
    if (visible >= size) return (viewport - size * scale) / 2;
    const minimum = Math.max(0, Math.max(size * 0.94, far) - visible);
    const maximum = Math.min(size - visible, size * 0.06, near);
    const start = Math.max(minimum, Math.min(maximum, (near + far - visible) / 2));
    return -start * scale;
  };
  return {
    scale,
    x: offset(windowWidth, worldWidth, required.left, required.right),
    y: offset(windowHeight, worldHeight, required.top, required.bottom),
  };
}
