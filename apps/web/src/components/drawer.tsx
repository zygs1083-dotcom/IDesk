import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useId } from "react";
import { useLang } from "../i18n/lang.tsx";
import { Button } from "./button.tsx";

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = useLang();
  const id = useId();
  const reduced = useReducedMotion();
  const modalRef = useCallback((node: HTMLDialogElement | null) => {
    if (node) {
      node.showModal();
      return () => node.close();
    }
  }, []);
  return (
    <AnimatePresence propagate>
      {open && (
        <motion.dialog
          ref={modalRef}
          aria-labelledby={id}
          onCancel={(event) => {
            event.preventDefault();
            onClose();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          className="fixed inset-0 m-0 flex h-dvh max-h-none w-screen max-w-none justify-end bg-black/25 backdrop:bg-transparent p-0 text-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <motion.div
            data-ui="drawer"
            initial={{ x: reduced ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduced ? 0 : "100%" }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="h-full w-120 max-w-full overflow-auto border-l border-line bg-surface p-6 shadow-pop"
          >
            <header className="mb-4 flex items-start justify-between gap-2">
              <h2 id={id} className="text-title">
                {title}
              </h2>
              <Button
                aria-label={t("common.close")}
                onClick={onClose}
                className="shrink-0 border-0 p-2"
              >
                <X size={18} strokeWidth={1.5} />
              </Button>
            </header>
            {children}
          </motion.div>
        </motion.dialog>
      )}
    </AnimatePresence>
  );
}
