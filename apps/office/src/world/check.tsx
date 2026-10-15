import { useEffect, useRef } from "react";
import type { Task } from "../director/events.ts";
import { Cards } from "../stage/card.ts";
import { Character } from "../stage/character.ts";
import { createDaylight } from "../stage/daylight.ts";
import type { OfficeAgent, SpriteKind } from "../stage/textures.ts";
import { loadWorldAssets } from "./assets.ts";
import { loadCatalog } from "./catalog.ts";
import { loadLayout } from "./layout.ts";
import { cellCenter } from "./path.ts";
import { deskFor } from "./places.ts";
import { Plaque } from "./plaque.ts";
import { seats } from "./seats.ts";
import { createStage } from "./stage.ts";
import "./check.css";

const task = (id: string): Task => ({
  id,
  title: id,
  body: "",
  status: "open",
  priority: "normal",
  tags: [],
  blockedBy: [],
  capabilities: [],
  publisherId: "human",
  assigneeId: null,
  recruit: null,
  leaseExpiresAt: null,
  result: null,
  dueAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  completedAt: null,
});

export function WorldCheck() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let stage: Awaited<ReturnType<typeof createStage>>;
    let observer: ResizeObserver;
    const start = async () => {
      const catalog = await loadCatalog();
      const layout = await loadLayout(catalog);
      const assets = await loadWorldAssets();
      await document.fonts.load('12px "Fusion Pixel"');
      if (!host.current || disposed) return;
      stage = await createStage(host.current, layout, catalog, assets);
      if (disposed) {
        stage.world.destroy({ children: true });
        stage.app.destroy(true, { children: true });
        return;
      }
      observer = new ResizeObserver(() => stage.app.resize());
      observer.observe(host.current);
      const cards = new Cards(stage);
      const characters = new Map<string, Character>();
      const kinds: SpriteKind[] = ["claude-code", "codex", "n8n", "script", "custom"];
      const targets = [
        ...seats(layout, catalog),
        ...layout.standing.map((point, index) => ({
          ...cellCenter(point),
          id: `standing-${index}`,
          zone: undefined,
        })),
      ];
      for (const [index, seat] of targets.entries()) {
        const kind =
          seat.id === layout.reception.chair
            ? "receptionist"
            : (kinds[index % kinds.length] as SpriteKind);
        const agent: OfficeAgent = {
          id: seat.id,
          kind,
          name: kind,
          host: "check",
          capabilities: [],
          webhookUrl: null,
          lastSeenAt: null,
          createdAt: "",
          status: "online",
        };
        const character = new Character(stage, agent, assets.sprites);
        character.position.copyFrom(seat);
        character.facing = seat.facing;
        character.setState(
          seat.id.startsWith("standing-")
            ? "idle"
            : seat.zone && index % 2 === 0
              ? "typing"
              : "sit",
        );
        stage.objects.addChild(character);
        characters.set(seat.id, character);
        const desk = deskFor(seat, layout, catalog);
        if (desk) cards.place(task(seat.id), desk);
      }
      for (let index = 0; index < 20; index++) cards.pin(task(`board-${index}`));
      layout.zones.forEach((zone, index) => {
        new Plaque(stage, zone.plaque).setText(
          index === 0
            ? "studio-alpha-with-an-extremely-long-hostname · second-machine"
            : `host-${index + 1}`,
        );
      });
      const hour = new URLSearchParams(location.search).get("hour");
      createDaylight(stage, characters, hour === null ? 12 : Number(hour));
      stage.app.renderer.render(stage.app.stage);
      stage.app.canvas.dataset.ready = "true";
    };
    void start();
    return () => {
      disposed = true;
      observer?.disconnect();
      stage?.world.destroy({ children: true });
      stage?.app.destroy(true, { children: true });
    };
  }, []);
  return <div className="world-check" ref={host} />;
}
