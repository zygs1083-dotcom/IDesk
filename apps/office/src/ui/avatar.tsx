import { useEffect, useRef } from "react";
import atlas from "../../public/sprites.json";
import type { Agent } from "./use-office-data.ts";

const spriteImage = new Image();
spriteImage.src = "/office/sprites.png";

export function Avatar({ kind }: { kind: Agent["kind"] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    void spriteImage.decode().then(() => {
      if (disposed) return;
      const context = canvas.current?.getContext("2d");
      if (!context) return;
      const frame = atlas.frames[`${kind}/walk/down/0`].frame;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, 128, 96);
      context.drawImage(spriteImage, frame.x, frame.y, frame.w, 48, 0, 0, 128, 96);
    });
    return () => {
      disposed = true;
    };
  }, [kind]);
  return (
    <canvas
      ref={canvas}
      width={128}
      height={96}
      className="avatar"
      role="img"
      aria-label={`${kind} 像素头像`}
    />
  );
}
