export const RELAY_KINDS = ["note", "deliverable", "request", "reply"] as const;
export type RelayKind = (typeof RELAY_KINDS)[number];
export const RELAY_KIND_LABEL: Record<RelayKind, string> = {
  note: "说明",
  deliverable: "成果",
  request: "请求",
  reply: "回复",
};

export type RelayRecipient =
  | { kind: "agent"; id: string }
  | { kind: "capability"; value: string }
  | { kind: "broadcast" };
