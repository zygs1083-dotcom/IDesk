import { type Container, Graphics } from "pixi.js";
import type { Point } from "./path.ts";
import type { Stage } from "./stage.ts";

export function drawDebug(stage: Stage, layer: Container) {
  layer.removeChildren().forEach((child) => {
    child.destroy();
  });
  const { layout } = stage;
  const lines = layer.addChild(new Graphics());
  layout.grid.rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === "#")
        lines
          .rect(x * layout.grid.cell, y * layout.grid.cell, layout.grid.cell, layout.grid.cell)
          .fill({ color: 0xff4444, alpha: 0.18 });
    });
  });
  for (const item of layout.occluders) {
    lines.poly(item.polygon.flat(), true).stroke({ color: 0x00ffff, width: 1 });
    const xs = item.polygon.map(([x]) => x);
    lines
      .moveTo(Math.min(...xs), item.baseline)
      .lineTo(Math.max(...xs), item.baseline)
      .stroke({ color: 0xff00ff, width: 1 });
  }
  for (const area of [...layout.zones.map((zone) => zone.plaque), layout.board])
    lines.rect(area.x, area.y, area.w, area.h).stroke({ color: 0xffa030, width: 1 });
  const cross = (point: Point, color: number) => {
    lines
      .moveTo(point.x - 5, point.y)
      .lineTo(point.x + 5, point.y)
      .moveTo(point.x, point.y - 5)
      .lineTo(point.x, point.y + 5)
      .stroke({ color, width: 1 });
  };
  for (const point of Object.values(layout.points)) cross(point, 0xffffff);
  for (const point of layout.spots) cross(point, 0x3080ff);
  for (const point of layout.standing) cross(point, 0xffa030);
  cross(layout.reception.counter, 0xffffff);
  for (const point of Object.values(layout.drops)) cross(point, 0xff80ff);
  for (const seat of layout.seats) {
    cross(seat, 0xffff00);
    cross(seat.workSpot, 0x00ff00);
  }
}
