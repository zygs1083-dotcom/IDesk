import { characterLayer } from "./seated-scene.mjs";

export function walkingBounds(atlas, sprites) {
  let left = 0,
    right = 0;
  for (const key of Object.keys(atlas.frames).filter((key) => key.includes("/walk/"))) {
    const slash = key.indexOf("/");
    const layer = characterLayer(
      { x: 0, y: 0, facing: "down" },
      key.slice(0, slash),
      key.slice(slash + 1),
      atlas,
      sprites,
    );
    for (let y = 0; y < layer.png.height; y++)
      for (let x = 0; x < layer.png.width; x++)
        if (layer.png.data[(y * layer.png.width + x) * 4 + 3]) {
          left = Math.min(left, layer.x + x);
          right = Math.max(right, layer.x + x + 1);
        }
  }
  return { left, right, clearance: Math.ceil(Math.max(-left, right) / 16) * 16 };
}
