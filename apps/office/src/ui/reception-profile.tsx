import { useEffect, useRef } from "react";
import { useLang } from "../i18n/lang.tsx";
import { Avatar } from "./avatar.tsx";
import { PixelButton } from "./pixel-button.tsx";
import "./profile.css";

export function ReceptionProfile({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector("button")?.focus();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="pixel-panel profile-modal"
      aria-modal="true"
      aria-label={t("reception.name")}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="panel-header">
        <h2>{t("profile.title")}</h2>
        <PixelButton onClick={onClose} aria-label={t("common.closePanel")}>
          ×
        </PixelButton>
      </header>
      <div className="profile-content">
        <div className="profile-identity">
          <Avatar id="human" fullFrame />
          <div>
            <h3>{t("reception.name")}</h3>
            <dl>
              <dt>{t("reception.post")}</dt>
              <dd>{t("reception.postValue")}</dd>
              <dt>{t("reception.likes")}</dt>
              <dd>{t("reception.likesValue")}</dd>
            </dl>
            <p>{t("reception.note")}</p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
