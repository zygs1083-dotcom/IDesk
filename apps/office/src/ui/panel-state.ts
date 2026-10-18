export type Panels = { top: boolean; left: boolean; right: boolean };

export const openPanels: Panels = { top: true, left: true, right: true };

export function readPanels(storage: Pick<Storage, "getItem">): Panels {
  const saved = storage.getItem("office.panels");
  if (!saved) return { ...openPanels };
  try {
    const value: Record<string, boolean> = JSON.parse(saved);
    if (
      typeof value.top === "boolean" &&
      typeof value.left === "boolean" &&
      typeof value.right === "boolean"
    )
      return { top: value.top, left: value.left, right: value.right };
  } catch {
    return { ...openPanels };
  }
  return { ...openPanels };
}

export function savePanels(storage: Pick<Storage, "setItem">, panels: Panels) {
  storage.setItem("office.panels", JSON.stringify(panels));
}

export function isFullscreenKey(
  event: Pick<KeyboardEvent, "key" | "repeat" | "altKey" | "ctrlKey" | "metaKey" | "target">,
) {
  const target = event.target as HTMLElement | null;
  return (
    event.key.toLowerCase() === "f" &&
    !event.repeat &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !(target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? ""))
  );
}
