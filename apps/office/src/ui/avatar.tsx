import { useEffect, useRef } from "react";
import atlas from "../../public/sprites.json";
import { useLang } from "../i18n/lang.tsx";
import { officeUrl } from "../office-url.ts";
import type { SpriteKind } from "../stage/textures.ts";

const spriteImage = new Image();
spriteImage.src = officeUrl("sprites.png");

export function Avatar({ kind, fullFrame = false }: { kind: SpriteKind; fullFrame?: boolean }) {
  const { t } = useLang();
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    void spriteImage.decode().then(() => {
      if (disposed) return;
      const context = canvas.current?.getContext("2d");
      if (!context) return;
      const frame = atlas.frames[`${kind}/walk/down/0`].frame;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, fullFrame ? 192 : 128, fullFrame ? 288 : 96);
      context.drawImage(
        spriteImage,
        frame.x,
        frame.y,
        frame.w,
        fullFrame ? frame.h : 48,
        0,
        0,
        fullFrame ? 192 : 128,
        fullFrame ? 288 : 96,
      );
    });
    return () => {
      disposed = true;
    };
  }, [kind, fullFrame]);
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
