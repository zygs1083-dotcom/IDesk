import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useId } from "react";
import { Button } from "./button.tsx";

export function Dialog({
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
          className="fixed inset-0 m-0 flex h-dvh max-h-none w-screen max-w-none items-center justify-center bg-black/25 backdrop:bg-transparent p-6 text-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="max-h-full w-120 max-w-full overflow-auto rounded-pop border border-line bg-surface p-4 shadow-pop">
            <header className="mb-4 flex items-center justify-between gap-2">
              <h2 id={id} className="text-section">
                {title}
              </h2>
              <Button aria-label="关闭" onClick={onClose} className="border-0 p-2">
                <X size={18} strokeWidth={1.5} />
              </Button>
            </header>
            {children}
          </div>
        </motion.dialog>
      )}
    </AnimatePresence>
  );
}
