import { labels } from "@idesk/shared/labels";
import type { TaskAction } from "@idesk/shared/task-machine";
import { useId, useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import type { Agent } from "../../lib/types.ts";
import type { HumanAction } from "./drop-action.ts";

type ParameterAction = Extract<HumanAction, "assign" | "handoff" | "recruit" | "complete">;
export function ActionDialog({
  action,
  agents,
  pending,
  onSubmit,
  onClose,
  error,
  onDismissError,
}: {
  action: ParameterAction;
  agents: Agent[];
  pending: boolean;
  onSubmit: (action: TaskAction) => void;
  onClose: () => void;
  error: string | null;
  onDismissError: () => void;
}) {
  const { lang, t } = useLang();
  const selectId = useId();
  const [agentId, setAgentId] = useState("");
  const [note, setNote] = useState("");
  const [needed, setNeeded] = useState(2);
  const enabled =
    action === "complete"
      ? true
      : action === "assign"
        ? !!agentId
        : action === "handoff"
          ? !!note.trim()
          : needed >= 2;
  return (
    <Dialog open onClose={onClose} title={labels(lang).action[action]}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(
            action === "complete"
              ? { type: action, result: note }
              : action === "assign"
                ? { type: action, agentId }
                : action === "handoff"
                  ? { type: action, to: agentId || null, note }
                  : { type: action, needed },
          );
        }}
      >
        {action === "complete" ? (
          <Field
            multiline
            label={t("desk.result")}
            rows={6}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        ) : action === "recruit" ? (
          <Field
            label={t("desk.agentCount")}
            type="number"
            min={2}
            value={needed}
            onChange={(event) => setNeeded(Number(event.target.value))}
          />
        ) : (
          <div className="space-y-2">
            <label htmlFor={selectId} className="block text-secondary text-text-2">
              {action === "handoff" ? t("desk.recipientOptional") : t("desk.recipient")}
            </label>
            <select
              id={selectId}
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              className="block w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text focus:outline-accent"
            >
              <option value="">
                {action === "handoff" ? t("desk.releaseToOpen") : t("desk.selectAgent")}
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}@{agent.host}
                </option>
              ))}
            </select>
          </div>
        )}
        {action === "handoff" && (
          <Field
            multiline
            label={t("desk.handoffNote")}
            rows={5}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            required
          />
        )}
        <Toast message={error} onClose={onDismissError} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={pending || !enabled}>
            {labels(lang).action[action]}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
