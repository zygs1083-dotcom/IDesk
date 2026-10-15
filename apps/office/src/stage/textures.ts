import type { publicAgentSchema } from "@idesk/shared/agent-schemas";
import type { z } from "zod";

export type Agent = z.infer<typeof publicAgentSchema>;
export type SpriteKind = Agent["kind"] | "receptionist";
export type OfficeAgent = Omit<Agent, "kind"> & { kind: SpriteKind };
