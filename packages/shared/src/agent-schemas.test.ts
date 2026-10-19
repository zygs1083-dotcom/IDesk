import { expect, test } from "vitest";
import { patchAgentSchema, publicAgentSchema, registerAgentSchema } from "./agent-schemas.ts";

test.each(["gemini", "opencode", "droid", "cursor"])(
  "accepts %s without allowing kind edits",
  (kind) => {
    const registration = { name: "Agent", kind, host: "host", capabilities: [] };
    expect(registerAgentSchema.parse(registration).kind).toBe(kind);
    expect(
      publicAgentSchema.parse({
        ...registration,
        id: "01",
        webhookUrl: null,
        client: null,
        lastSeenAt: null,
        createdAt: "2026-10-18T00:00:00Z",
        status: "online",
      }).kind,
    ).toBe(kind);
    expect(patchAgentSchema.parse({ kind })).not.toHaveProperty("kind");
  },
);
