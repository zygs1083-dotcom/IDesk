import { Application } from "pixi.js";
import { useEffect, useRef } from "react";
import { loadWorldAssets } from "./assets.ts";
import { loadCatalog, TILE } from "./catalog.ts";
import { loadLayout } from "./layout.ts";
import { renderWorld } from "./render.ts";
import { worldScale } from "./scale.ts";
import { seats } from "./seats.ts";
import "./preview.css";

export function WorldPreview() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const app = new Application();
    let disposed = false;
    let resize: (() => void) | undefined;
    const ready = async () => {
      const catalog = await loadCatalog();
      const [layout, assets] = await Promise.all([loadLayout(catalog), loadWorldAssets()]);
      await app.init({ resizeTo: window, background: 0x49352c, antialias: false });
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      host.current?.appendChild(app.canvas);
      const fill = new URLSearchParams(window.location.search).get("fill") === "1";
      const kinds = ["codex", "claude-code", "n8n", "script", "custom"];
      const people = seats(layout, catalog).map((seat, i) => {
        const kind =
          seat.id === "front-chair" ? "receptionist" : (kinds[i % kinds.length] as string);
        const side = seat.facing === "left" || seat.facing === "right";
        const seated = `sit/${side ? "right" : seat.facing}`;
        const frame =
          fill && (side || assets.sprites[`${kind}/${seated}`]) ? seated : `walk/${seat.facing}/0`;
        return {
          kind,
          frame,
          mirror: fill && side && seat.facing === "left",
          x: seat.x,
          y: seat.y,
        };
      });
      const world = app.stage.addChild(renderWorld(app, layout, catalog, assets, people));
      resize = () => {
        const w = layout.size.w * TILE;
        const h = layout.size.h * TILE;
        const scale = worldScale(window.innerWidth, window.innerHeight, w, h);
        world.scale.set(scale);
        world.position.set(
          Math.floor((window.innerWidth - w * scale) / 2),
          Math.floor((window.innerHeight - h * scale) / 2),
        );
      };
      resize();
      app.renderer.render(app.stage);
      app.canvas.dataset.ready = "true";
      window.addEventListener("resize", resize);
    };
    void ready();
    return () => {
      disposed = true;
      if (resize) {
        window.removeEventListener("resize", resize);
        app.destroy(true, { children: true });
      }
    };
  }, []);
  return <div className="world-preview" ref={host} />;
}
