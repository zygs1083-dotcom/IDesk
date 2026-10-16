import { labels } from "@idesk/shared/labels";
import { useId } from "react";
import { missingCapabilities } from "../../components/capability-options.ts";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { useAgents } from "../../lib/use-agents.ts";

export function DispatchFields({
  capabilities,
  mode,
  onModeChange,
  agentId,
  onAgentChange,
  needed,
  onNeededChange,
}: {
  capabilities: string[];
  mode: "open" | "assign" | "recruit";
  onModeChange: (mode: "open" | "assign" | "recruit") => void;
  agentId: string;
  onAgentChange: (id: string) => void;
  needed: number;
  onNeededChange: (needed: number) => void;
}) {
  const { lang, t } = useLang();
  const { agents } = useAgents();
  const selectId = useId();
  const selected = agents.find((agent) => agent.id === agentId);
  const missing = selected ? missingCapabilities(capabilities, selected.capabilities) : [];
  return (
    <div className="space-y-2">
      <Segmented
        label={t("desk.dispatch")}
        value={mode}
        onChange={onModeChange}
        options={[
          { value: "open", label: labels(lang).status.open },
          { value: "assign", label: labels(lang).action.assign },
          { value: "recruit", label: labels(lang).action.recruit },
        ]}
      />
      {mode === "assign" && (
        <div className="space-y-2">
          <label htmlFor={selectId} className="block text-secondary text-text-2">
            {t("desk.recipient")}
          </label>
          <select
            id={selectId}
            value={agentId}
            onChange={(event) => onAgentChange(event.target.value)}
            className="block w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text focus:outline-accent"
          >
            <option value="">{t("desk.selectAgent")}</option>
            {(["online", "offline"] as const).map((status) => {
              const group = agents.filter(
                (agent) => (agent.status === "online") === (status === "online"),
              );
              return (
                group.length > 0 && (
                  <optgroup key={status} label={t(`common.${status}`)}>
                    {group.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}@{agent.host}
                      </option>
                    ))}
                  </optgroup>
                )
              );
            })}
          </select>
          {missing.length > 0 && (
            <p aria-live="polite" className="text-secondary text-status-paused">
              {t("capability.missing", { values: missing.join(lang === "zh" ? "、" : ", ") })}
            </p>
          )}
        </div>
      )}
      {mode === "recruit" && (
        <Field
          label={t("desk.agentCount")}
          type="number"
          min={2}
          value={needed}
          onChange={(event) => onNeededChange(Number(event.target.value))}
        />
      )}
    </div>
  );
}
