import type { Texture } from "pixi.js";
import { useContext, useEffect, useRef } from "react";
import { useLang } from "../i18n/lang.tsx";
import { characterFrames, characterSheets } from "../world/characters.ts";
import { OutfitContext } from "./outfits.tsx";

export function Avatar({ id, fullFrame = false }: { id: string; fullFrame?: boolean }) {
  const kind = useContext(OutfitContext).get(id);
  const { t } = useLang();
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!kind) return;
    const sheet = characterSheets.get(kind);
    if (!sheet) return;
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const frame = (characterFrames[`${kind}/walk/down/0`] as Texture).frame;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, fullFrame ? 192 : 128, fullFrame ? 288 : 96);
    context.drawImage(
      sheet.textureSource.resource as CanvasImageSource,
      frame.x,
      frame.y,
      frame.width,
      fullFrame ? frame.height : 48,
      0,
      0,
      fullFrame ? 192 : 128,
      fullFrame ? 288 : 96,
    );
  }, [kind, fullFrame]);
  if (!kind) return null;
  return (
    <canvas
      ref={canvas}
      width={fullFrame ? 192 : 128}
      height={fullFrame ? 288 : 96}
      className={fullFrame ? "profile-avatar" : "avatar"}
      role="img"
      aria-label={t("common.pixelAvatar", { kind })}
    />
  );
}
