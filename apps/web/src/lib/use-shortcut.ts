import { useEffect } from "react";

export function useShortcut(key: string, handler: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== key || event.ctrlKey || event.metaKey || event.altKey || event.repeat)
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest("input, textarea, select") || target.isContentEditable)
      )
        return;
      if (document.querySelector("dialog[open], [role=menu]")) return;
      event.preventDefault();
      handler();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, handler]);
}
