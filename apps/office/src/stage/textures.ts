import type { publicAgentSchema } from "@idesk/shared/agent-schemas";
import { Assets, type Spritesheet } from "pixi.js";
import type { z } from "zod";

export type Agent = z.infer<typeof publicAgentSchema>;
export const sprites = Assets.load<Spritesheet>("/office/sprites.json");
