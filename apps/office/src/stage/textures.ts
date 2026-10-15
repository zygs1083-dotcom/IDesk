import type { publicAgentSchema } from "@idesk/shared/agent-schemas";
import { Assets, type Spritesheet } from "pixi.js";
import type { z } from "zod";
import { officeUrl } from "../office-url.ts";

export type Agent = z.infer<typeof publicAgentSchema>;
export const sprites = Assets.load<Spritesheet>(officeUrl("sprites.json"));
