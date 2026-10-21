import { Assets, Spritesheet, type SpritesheetData, Texture } from "pixi.js";
import { officeUrl } from "../office-url.ts";
import type { OutfitIndex } from "../stage/outfits.ts";

let index: Promise<OutfitIndex> | undefined;
const loading = new Map<string, Promise<Spritesheet>>();
export const characterSheets = new Map<string, Spritesheet>();
export const characterFrames: Record<string, Texture> = {};
export let receptionistImage: Blob | undefined;

export function loadOutfitIndex() {
  index ??= fetch(officeUrl("characters/index.json")).then((response) => response.json());
  return index;
}

export function loadCharacters(ids: Iterable<string>) {
  return Promise.all(
    [...new Set(ids)].map((id) => {
      let promise = loading.get(id);
      if (!promise) {
        promise = (async () => {
          const data: SpritesheetData = await fetch(officeUrl(`characters/${id}.json`)).then(
            (response) => response.json(),
          );
          let texture: Texture;
          if (id === "receptionist") {
            const response = await fetch(officeUrl(`characters/${id}.png`));
            const image = await response.blob();
            texture = Texture.from(await createImageBitmap(image));
            receptionistImage = image;
          } else {
            texture = await Assets.load<Texture>(officeUrl(`characters/${id}.png`));
          }
          texture.source.scaleMode = "nearest";
          const sheet = new Spritesheet(texture, data);
          await sheet.parse();
          Object.assign(characterFrames, sheet.textures);
          characterSheets.set(id, sheet);
          return sheet;
        })();
        loading.set(id, promise);
      }
      return promise;
    }),
  );
}
