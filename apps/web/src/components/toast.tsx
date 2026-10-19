import { X } from "lucide-react";
import { useEffect } from "react";
import { useLang } from "../i18n/lang.tsx";
import { Button } from "./button.tsx";
import { PixelIcon } from "./pixel-icon.tsx";

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  const { t } = useLang();
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  return (
    message && (
      <div
        role="alert"
        data-ui="toast"
        className="fixed right-6 bottom-6 z-50 flex max-w-full items-center gap-4 rounded-control border border-line bg-surface px-4 py-3 text-body shadow-pop"
      >
        <span>{message}</span>
        <Button
          aria-label={t("common.dismissNotification")}
          title={t("common.dismissNotification")}
          variant="icon"
          onClick={onClose}
          className="border-0 p-1"
        >
          <PixelIcon name="close" fallback={<X size={16} strokeWidth={1.5} />} />
        </Button>
      </div>
    )
  );
}
