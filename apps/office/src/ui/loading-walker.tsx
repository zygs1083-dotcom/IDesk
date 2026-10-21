import type { Spritesheet, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

export function LoadingWalker({ sheet, image }: { sheet: Spritesheet; image: Blob }) {
  const walker = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = walker.current as HTMLDivElement;
    const url = URL.createObjectURL(image);
    const frame = (sheet.textures["receptionist/walk/right/0"] as Texture).frame;
    const scale = 48 / frame.width;
    element.style.setProperty("--loading-sprite", `url("${url}")`);
    element.style.setProperty(
      "--loading-sheet-size",
      `${sheet.textureSource.width * scale}px ${sheet.textureSource.height * scale}px`,
    );
    for (let index = 0; index < 4; index++) {
      const { x, y } = (sheet.textures[`receptionist/walk/right/${index}`] as Texture).frame;
      element.style.setProperty(`--loading-frame-${index}`, `${-x * scale}px ${-y * scale}px`);
    }
    return () => URL.revokeObjectURL(url);
  }, [sheet, image]);
  return <div className="loading-walker" aria-hidden="true" ref={walker} />;
}
