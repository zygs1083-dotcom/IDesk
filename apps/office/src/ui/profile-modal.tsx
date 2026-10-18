import { AGENT_KIND_LABELS } from "@idesk/shared/agent-schemas";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../i18n/lang.tsx";
import { Avatar } from "./avatar.tsx";
import { PixelButton } from "./pixel-button.tsx";
import { ProfileActions } from "./profile-actions.tsx";
import { ProfileActivity } from "./profile-activity.tsx";
import { ProfileStats } from "./profile-stats.tsx";
import { statusText } from "./status-text.ts";
import type { Agent, Task } from "./use-office-data.ts";
import "./profile.css";

export function ProfileModal({
  agent,
  agents,
  tasks,
  admin,
  onClose,
}: {
  agent: Agent;
  agents: Agent[];
  tasks: Task[];
  admin: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const dialog = useRef<HTMLDialogElement>(null);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector("button")?.focus();
    return () => {
      element?.close();
      clearTimeout(noticeTimer.current);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const announce = (message: string) => {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(""), 3000);
  };
  return (
    <dialog
      ref={dialog}
      className="pixel-panel profile-modal"
      aria-modal="true"
      aria-label={agent.name}
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
        <p className="profile-notice" role="status">
          {notice}
        </p>
        <div className="profile-identity">
          <Avatar id={agent.id} fullFrame />
          <div>
            <h3>{agent.name}</h3>
            <dl>
              <dt>{t("panel.type")}</dt>
              <dd>{AGENT_KIND_LABELS[agent.kind]}</dd>
              <dt>{t("panel.host")}</dt>
              <dd>{agent.host}</dd>
              <dt>{t("common.capabilities")}</dt>
              <dd>{agent.capabilities.join(" · ") || t("common.none")}</dd>
            </dl>
            <p>{statusText(agent, tasks, t)}</p>
          </div>
        </div>
        <ProfileStats agentId={agent.id} />
        <ProfileActivity agent={agent} agents={agents} tasks={tasks} />
        {admin && <ProfileActions agentId={agent.id} tasks={tasks} onSuccess={announce} />}
      </div>
    </dialog>
  );
}
