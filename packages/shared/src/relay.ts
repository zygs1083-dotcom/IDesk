export const RELAY_KINDS = ["note", "deliverable", "request", "reply"] as const;
export type RelayKind = (typeof RELAY_KINDS)[number];
export type RelayRecipient =
  | { kind: "agent"; id: string }
  | { kind: "capability"; value: string }
  | { kind: "broadcast" };
