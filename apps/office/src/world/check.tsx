import { useEffect, useRef } from "react";
import type { Task } from "../director/events.ts";
import { translator } from "../i18n/translate.ts";
import { Cards } from "../stage/card.ts";
import { Character } from "../stage/character.ts";
import { createDaylight } from "../stage/daylight.ts";
import { initialGlyphs, loadGlyphs } from "../stage/glyphs.ts";
import type { OfficeAgent, SpriteKind } from "../stage/textures.ts";
import { loadWorldAssets } from "./assets.ts";
import { installDebug } from "./debug.ts";
import { loadLayout } from "./layout.ts";
import { workSpot } from "./places.ts";
import { Plaque } from "./plaque.ts";
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
      const layout = await loadLayout();
      const assets = await loadWorldAssets();
      await loadGlyphs(initialGlyphs);
      if (!host.current || disposed) return;
      stage = await createStage(host.current, layout, assets);
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
        ...layout.seats,
        ...layout.standing.map((point, index) => ({
          ...point,
          id: `standing-${index}`,
          zone: undefined,
        })),
      ];
      for (const [index, seat] of targets.entries()) {
        const kind =
          seat.id === layout.reception.seat
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
        character.mirror = "mirror" in seat && seat.mirror === true;
        character.setState(
          seat.id.startsWith("standing-")
            ? "idle"
            : seat.zone && index % 2 === 0
              ? "typing"
              : "sit",
        );
        stage.objects.addChild(character);
        characters.set(seat.id, character);
        const desk =
          seat.zone && "workSpot" in seat ? workSpot(seat.workSpot, seat.y, layout) : undefined;
        if (desk) cards.place(task(seat.id), desk);
      }
      cards.place(
        task("meeting"),
        workSpot(layout.meeting.workSpot, layout.meeting.workSpot.y, layout),
      );
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
      installDebug(stage, translator("en"), () => true);
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
