import type { publicAgentSchema } from "@idesk/shared/agent-schemas";
import { type Application, Graphics, Rectangle, type Texture } from "pixi.js";
import type { z } from "zod";

export type Agent = z.infer<typeof publicAgentSchema>;
const hues: Record<Agent["kind"], number> = {
  "claude-code": 24,
  codex: 207,
  n8n: 20,
  script: 88,
  custom: 292,
};

export function placeholderFrames(app: Application, agent: Agent) {
  const { kind, id } = agent;
  const hash = [...id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) | 0, 0);
  const color = `hsl(${hues[kind] + Math.abs(hash % 21) - 10}, 38%, 58%)`;
  const frames: Record<string, Texture> = {};
  const poses: [string, number, number][] = ["down", "left", "right", "up"].flatMap((direction) =>
    Array.from(
      { length: 4 },
      (_, frame) => [`walk/${direction}/${frame}`, frame, 0] as [string, number, number],
    ),
  );
  poses.push(["sit/0", 0, 24], ["typing/0", 1, 24], ["typing/1", 3, 24]);
  for (const [pose, frame, top] of poses) {
    const shape = new Graphics()
      .rect(0, top, 64, 96 - top)
      .fill(color)
      .rect(12, top + 8, 40, 32)
      .fill(0xf4d9ae)
      .rect(frame === 1 ? 8 : 12, 84, 14, 12)
      .fill(0x443c38)
      .rect(frame === 3 ? 42 : 38, 84, 14, 12)
      .fill(0x443c38);
    frames[`${kind}/${pose}`] = app.renderer.generateTexture({
      target: shape,
      frame: new Rectangle(0, 0, 64, 96),
    });
    shape.destroy();
  }
  return frames;
}
