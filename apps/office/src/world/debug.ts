import { Container, type FederatedPointerEvent, Graphics, Rectangle } from "pixi.js";
import type { Translate } from "../i18n/translate.ts";
import { Character } from "../stage/character.ts";
import { drawDebug } from "./debug-draw.ts";
import { cellOf, type Point } from "./path.ts";
import type { Stage } from "./stage.ts";

export function installDebug(stage: Stage, t: Translate, authorized: () => boolean) {
  const layer = stage.world.addChild(new Container({ visible: false }));
  const drawing = layer.addChild(new Container());
  const handles = layer.addChild(new Container());
  const button = document.createElement("button");
  button.className = "pixel-button office-debug-export";
  button.textContent = t("debug.export");
  button.hidden = true;
  (stage.app.canvas.parentElement as HTMLElement).appendChild(button);
  let dragging: { point: Point; seat: Point } | undefined;
  const redraw = () => {
    drawDebug(stage, drawing);
    handles.removeChildren().forEach((child) => {
      child.destroy();
    });
    for (const seat of stage.layout.seats) {
      for (const [point, color] of [
        [seat, 0xffff00],
        [seat.workSpot, 0x00ff00],
      ] as const) {
        const handle = handles.addChild(
          new Graphics().circle(0, 0, 6).fill({ color, alpha: 0.65 }),
        );
        handle.position.copyFrom(point);
        handle.eventMode = "static";
        handle.cursor = "move";
        handle.on("pointerdown", (event: FederatedPointerEvent) => {
          event.stopPropagation();
          dragging = { point, seat };
        });
      }
    }
  };
  const move = (event: FederatedPointerEvent) => {
    if (!dragging) return;
    const point = stage.world.toLocal(event.global);
    const x = Math.round(point.x),
      y = Math.round(point.y);
    if (x < 0 || y < 0 || x >= stage.layout.size.w || y >= stage.layout.size.h) return;
    const { point: target, seat } = dragging;
    const cell = cellOf({ x, y });
    if (target === seat && stage.layout.grid.rows[cell.y]?.[cell.x] !== ".") return;
    for (const child of stage.objects.children)
      if (target === seat && child instanceof Character && child.x === seat.x && child.y === seat.y)
        child.position.set(x, y);
    Object.assign(target, { x, y });
    redraw();
  };
  const stop = () => {
    dragging = undefined;
  };
  const key = (event: KeyboardEvent) => {
    const target = event.target;
    if (
      event.key.toLowerCase() !== "e" ||
      !authorized() ||
      event.repeat ||
      (target instanceof HTMLElement &&
        (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName)))
    )
      return;
    layer.visible = !layer.visible;
    button.hidden = !layer.visible;
    stage.lights.visible = !layer.visible;
    if (layer.visible) redraw();
    else stop();
  };
  button.onclick = () => {
    const url = URL.createObjectURL(
      new Blob([`${JSON.stringify(stage.layout, null, 2)}\n`], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "layout.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  stage.app.stage.eventMode = "static";
  const resize = () => {
    stage.app.stage.hitArea = new Rectangle(0, 0, stage.app.screen.width, stage.app.screen.height);
  };
  resize();
  stage.app.renderer.on("resize", resize);
  stage.app.stage.on("globalpointermove", move);
  stage.app.stage.on("pointerup", stop);
  stage.app.stage.on("pointerupoutside", stop);
  window.addEventListener("keydown", key);
  stage.world.on("destroyed", () => {
    window.removeEventListener("keydown", key);
    stage.app.stage.off("globalpointermove", move);
    stage.app.stage.off("pointerup", stop);
    stage.app.stage.off("pointerupoutside", stop);
    stage.app.renderer.off("resize", resize);
    button.remove();
  });
}
