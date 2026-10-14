import { useEffect, type ReactNode } from "react";

export function Modal({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="card fade-in p-6 max-h-[88vh] overflow-y-auto" style={{ width, borderRadius: 20, boxShadow: "var(--shadow-lg)" }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center mb-4">
          <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} className="ml-auto size-7 rounded-full bg-surface-2 text-ink-2 grid place-items-center hover:bg-surface-3">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
