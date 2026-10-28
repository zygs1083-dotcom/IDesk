import { type FocusEvent, type RefObject, useLayoutEffect, useRef, useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { useLang } from "../../i18n/lang.tsx";

export function usePublishCloseGuard(
  form: RefObject<HTMLFormElement | null>,
  dirty: boolean,
  pending: boolean,
  onClose: () => void,
) {
  const { t } = useLang();
  const [confirming, setConfirming] = useState(false);
  const lastField = useRef<HTMLElement | null>(null);
  const legacyKeep = useRef<HTMLButtonElement>(null);
  const footerKeep = useRef<HTMLButtonElement>(null);
  const scroll = useRef<{ node: HTMLElement; top: number; left: number }[]>([]);
  useLayoutEffect(() => {
    if (confirming) {
      [legacyKeep.current, footerKeep.current]
        .find((button) => button && button.getClientRects().length > 0)
        ?.focus({ preventScroll: true });
    } else {
      const field = lastField.current;
      const target =
        field &&
        form.current?.contains(field) &&
        !field.matches(":disabled") &&
        field.getClientRects().length > 0
          ? field
          : form.current?.querySelector("input");
      target?.focus({ preventScroll: true });
    }
    for (const { node, top, left } of scroll.current) {
      node.scrollTop = top;
      node.scrollLeft = left;
    }
    if (!confirming) scroll.current = [];
  }, [confirming, form]);
  function requestClose() {
    if (pending || confirming) return;
    if (!dirty) return onClose();
    scroll.current = [
      form.current?.closest<HTMLElement>('[data-ui="panel"]'),
      form.current?.closest<HTMLElement>('[data-ui="overlay-body"]'),
    ]
      .filter((node): node is HTMLElement => !!node)
      .map((node) => ({ node, top: node.scrollTop, left: node.scrollLeft }));
    setConfirming(true);
  }
  return {
    requestClose,
    rememberFocus: (event: FocusEvent<HTMLFormElement>) => {
      if (!event.target.closest("[data-publish-close]")) lastField.current = event.target;
    },
    confirmation: confirming && (
      <Dialog
        open
        title={t("desk.discardTitle")}
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button ref={footerKeep} onClick={() => setConfirming(false)}>
              {t("desk.keepEditing")}
            </Button>
            <Button variant="danger" onClick={onClose}>
              {t("desk.discard")}
            </Button>
          </>
        }
      >
        <p className="text-secondary text-text-2">{t("desk.discardDescription")}</p>
        <div className="pixel-legacy mt-4 flex justify-end gap-2">
          <Button ref={legacyKeep} onClick={() => setConfirming(false)}>
            {t("desk.keepEditing")}
          </Button>
          <Button variant="danger" onClick={onClose}>
            {t("desk.discard")}
          </Button>
        </div>
      </Dialog>
    ),
  };
}
