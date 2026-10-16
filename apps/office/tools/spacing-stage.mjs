import { Cast } from "../src/director/cast.ts";
import { startIdle } from "../src/director/idle.ts";
import { idleMoves } from "../src/director/idle-moves.ts";
import { translator } from "../src/i18n/translate.ts";
import { createDaylight } from "../src/stage/daylight.ts";
import { initialGlyphs, loadGlyphs } from "../src/stage/glyphs.ts";
import { loadWorldAssets } from "../src/world/assets.ts";
import { loadLayout } from "../src/world/layout.ts";
import { chatSeats } from "../src/world/places.ts";
import { createStage } from "../src/world/stage.ts";

export async function spacingStage(count = 24) {
  const layout = await loadLayout();
  const assets = await loadWorldAssets();
  await loadGlyphs(initialGlyphs);
  const host = document.body;
  host.style.cssText = "margin:0;width:100vw;height:100vh;overflow:hidden";
  const stage = await createStage(host, layout, assets);
  const cast = new Cast(stage, assets.sprites, "礼仪");
  const kinds = ["claude-code", "codex", "n8n", "script", "custom"];
  cast.update(
    Array.from({ length: count }, (_, index) => ({
      id: `agent-${index}`,
      kind: kinds[index % kinds.length],
      name: `Agent ${index + 1}`,
      host: "spacing",
      capabilities: [],
      webhookUrl: null,
      lastSeenAt: null,
      createdAt: "",
      status: "online",
    })),
    true,
  );
  createDaylight(stage, cast.characters, 12);
  const t = translator("en");
  const snapshot = new Map();
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const moves = idleMoves(cast, snapshot, t, wait, () => 0.5);
  return {
    stage,
    cast,
    moves,
    async chat() {
      const seat = cast.seats.get("agent-0");
      const occupied = [...cast.characters]
        .filter(([id, person]) => !["agent-0", "agent-1"].includes(id) && person.state !== "away")
        .map(([, person]) => person);
      const targets = chatSeats(seat, layout, occupied);
      if (!targets) throw new Error("No chat space");
      this.chatTargets = targets;
      this.pending = moves.chat("agent-0", "agent-1");
    },
    visit(spot) {
      const index = layout.spots.findIndex((item) => item.id === spot);
      const draws = [(index + 0.1) / layout.spots.length, 0.9, 0.5, 0.5, 0.5, 0.5];
      const visitors = idleMoves(
        cast,
        snapshot,
        t,
        (ms) => wait(ms + 12000),
        () => draws.shift() ?? 0.5,
      );
      this.draws = draws;
      this.visiting = spot;
      this.visitors = visitors;
      this.pending = visitors.spot("agent-0");
    },
    second() {
      const available = layout.spots.filter((spot) => spot.id !== this.visiting);
      const alternate = this.visiting === "printer" ? "bookshelf" : "sofa";
      const index = available.findIndex((spot) => spot.id === alternate);
      this.draws.splice(0, this.draws.length, (index + 0.1) / available.length, 0.9, 0.5, 0.5);
      this.secondPending = this.visitors.spot("agent-1");
    },
    idle() {
      startIdle(cast, snapshot, t);
    },
    walkRoute(route) {
      const start = route === "desk" ? { x: 456, y: 280 } : { x: 392, y: 552 };
      const height = layout.grid.silhouette.bottom - layout.grid.silhouette.top;
      const spacing = (Math.ceil(height / layout.grid.cell) + 1) * layout.grid.cell;
      const distance = layout.grid.cell * 16;
      for (const [index, id] of ["human", "agent-0"].entries())
        cast.place(id, { ...start, y: start.y - index * spacing, facing: "down" }, "idle");
      stage.app.stop();
      this.time = performance.now();
      this.pending = Promise.all(
        ["human", "agent-0"].map((id, index) =>
          cast.walk(id, { ...start, y: start.y + distance - index * spacing, facing: "down" }, 120),
        ),
      );
    },
    async step(ms) {
      for (let elapsed = 0; elapsed < ms; elapsed += 16) {
        this.time += 16;
        stage.app.ticker.update(this.time);
        await Promise.resolve();
      }
      stage.app.renderer.render(stage.app.stage);
    },
  };
}
