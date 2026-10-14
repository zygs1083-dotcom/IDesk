import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./button.tsx";

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  return (
    message && (
      <div
        role="alert"
        className="fixed right-6 bottom-6 z-50 flex max-w-full items-center gap-4 rounded-control border border-line bg-surface px-4 py-3 text-body shadow-pop"
      >
        <span>{message}</span>
        <Button aria-label="关闭提示" onClick={onClose} className="border-0 p-1">
          <X size={16} strokeWidth={1.5} />
        </Button>
      </div>
    )
  );
}
