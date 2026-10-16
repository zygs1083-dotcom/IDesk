import { direct } from "../src/director/director.ts";
import { translator } from "../src/i18n/translate.ts";
import { initialGlyphs, loadGlyphs } from "../src/stage/glyphs.ts";
import { loadWorldAssets } from "../src/world/assets.ts";
import { loadLayout } from "../src/world/layout.ts";
import { createStage } from "../src/world/stage.ts";

export async function acceptanceStage() {
  const layout = await loadLayout();
  const assets = await loadWorldAssets();
  await loadGlyphs(initialGlyphs);
  document.body.style.cssText = "margin:0;width:100vw;height:100vh;overflow:hidden";
  const stage = await createStage(document.body, layout, assets);
  const cast = await direct(stage, translator("zh"));
  const observer = new ResizeObserver(() => stage.app.resize());
  observer.observe(document.body);
  return {
    stage,
    cast,
    sample() {
      return [...cast.characters].map(([id, person]) => {
        const seat = cast.seats.get(id);
        return {
          id,
          x: person.x,
          y: person.y,
          state: person.state,
          seated: seat?.x === person.x && seat?.y === person.y,
        };
      });
    },
  };
}
