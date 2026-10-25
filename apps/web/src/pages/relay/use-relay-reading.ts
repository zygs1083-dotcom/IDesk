import { useLayoutEffect, useRef } from "react";

export function useRelayReading(selectedId: string | null) {
  const page = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const desk = useRef<HTMLElement>(null);
  const previous = useRef<string | null>(null);
  const position = useRef({ list: 0, workspace: 0 });

  const rememberList = () => {
    const workspace = page.current?.closest<HTMLElement>("[data-ui='workspace']");
    if (!list.current?.getClientRects().length || !workspace) return;
    position.current = { list: list.current.scrollTop, workspace: workspace.scrollTop };
  };

  useLayoutEffect(() => {
    const root = page.current;
    const workspace = root?.closest<HTMLElement>("[data-ui='workspace']");
    if (!root || !workspace) return;
    const media = window.matchMedia("(max-width: 767px)");
    const focusList = (id: string | null) => {
      const row = Array.from(
        list.current?.querySelectorAll<HTMLButtonElement>("[data-message-id]") ?? [],
      ).find((element) => element.dataset.messageId === id);
      const target = row ?? root.querySelector<HTMLInputElement>("[data-ui='relay-search'] input");
      target?.focus({ preventScroll: true });
    };
    const restoreList = () => {
      if (list.current) list.current.scrollTop = position.current.list;
      workspace.scrollTop = position.current.workspace;
    };

    if (media.matches && selectedId !== previous.current) {
      if (selectedId) {
        workspace.scrollTop = 0;
        back.current?.focus({ preventScroll: true });
      } else if (previous.current) {
        const active = document.activeElement;
        restoreList();
        if (active === document.body || active === back.current || desk.current?.contains(active))
          focusList(previous.current);
      }
    }
    previous.current = selectedId;

    const change = () => {
      const active = document.activeElement;
      if (media.matches) {
        if (selectedId) {
          workspace.scrollTop = 0;
          if (
            list.current?.contains(active) ||
            root.querySelector("[data-ui='relay-toolbar']")?.contains(active)
          )
            back.current?.focus({ preventScroll: true });
        } else if (desk.current?.contains(active)) focusList(null);
      } else if (selectedId) {
        restoreList();
        if (active === back.current) desk.current?.focus({ preventScroll: true });
      }
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [selectedId]);

  return { page, list, back, desk, rememberList };
}
