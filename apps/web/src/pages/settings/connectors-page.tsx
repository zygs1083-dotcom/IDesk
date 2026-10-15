import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { useShortcut } from "../../lib/use-shortcut.ts";
import { ConnectorDialog } from "./connector-dialog.tsx";
import { ConnectorRow } from "./connector-row.tsx";
import type { ConnectionResult, Connector, Plugin } from "./types.ts";

export function ConnectorsPage() {
  const { t } = useLang();
  const client = useQueryClient();
  const connectors = useQuery({
    queryKey: ["automation", "connectors"],
    refetchInterval: (query) => (query.state.data?.some((c) => c.progress) ? 2000 : false),
    queryFn: () => request<Connector[]>("/connectors"),
  });
  const plugins = useQuery({ queryKey: ["plugins"], queryFn: () => request<Plugin[]>("/plugins") });
  const [editing, setEditing] = useState<Connector | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Connector | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const test = useMutation({
    mutationFn: (connector: Connector) =>
      request<ConnectionResult>("/connectors/test", {
        method: "POST",
        body: JSON.stringify({
          id: connector.id,
          pluginId: connector.pluginId,
          config: connector.config,
        }),
      }),
    onSuccess: (result) =>
      setMessage(result.success ? t("settings.connectionSuccessful") : (result.error ?? null)),
    onError: (error) => setMessage(error.message),
  });
  const toggle = useMutation({
    mutationFn: (connector: Connector) =>
      request<Connector>(`/connectors/${connector.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !connector.enabled }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["automation"] }),
    onError: (error) => setMessage(error.message),
  });
  const remove = useMutation({
    mutationFn: (connector: Connector) =>
      request<void>(`/connectors/${connector.id}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleting(null);
      void client.invalidateQueries({ queryKey: ["automation"] });
    },
    onError: (error) => setMessage(error.message),
  });
  useShortcut("n", () => {
    if (plugins.data) setCreating(true);
  });
  const error = connectors.error ?? plugins.error;
  return (
    <section className="space-y-4" aria-label={t("settings.connectors")}>
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-section">{t("settings.connectors")}</h2>
        <Button variant="primary" disabled={!plugins.data} onClick={() => setCreating(true)}>
          {t("settings.addConnector")}
        </Button>
      </header>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {connectors.isPending && (
        <p className="text-secondary text-text-2">{t("settings.loading")}</p>
      )}
      {!error && connectors.data?.length === 0 && (
        <div className="py-16 text-center text-secondary text-text-2">
          <p>{t("settings.noConnectorsYet")}</p>
          <Button className="mt-3" disabled={!plugins.data} onClick={() => setCreating(true)}>
            {t("settings.addConnector")}
          </Button>
        </div>
      )}
      {!!connectors.data?.length && (
        <div className="rounded-panel border border-line bg-surface">
          {connectors.data.map((connector) => (
            <ConnectorRow
              key={connector.id}
              connector={connector}
              busy={test.isPending || toggle.isPending || remove.isPending}
              onTest={() => test.mutate(connector)}
              onToggle={() => toggle.mutate(connector)}
              onDelete={() => setDeleting(connector)}
              onEdit={() => setEditing(connector)}
            />
          ))}
        </div>
      )}
      {creating && plugins.data && (
        <ConnectorDialog
          plugins={plugins.data.filter((plugin) => plugin.kind === "connector" && plugin.enabled)}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && plugins.data && (
        <ConnectorDialog
          connector={editing}
          plugins={plugins.data}
          onClose={() => setEditing(null)}
        />
      )}
      <Dialog
        open={!!deleting}
        title={t("settings.deleteConnector", { p1: deleting?.name ?? "" })}
        onClose={() => setDeleting(null)}
      >
        <p className="text-secondary text-text-2">{t("settings.itsWorkflowsAndRunsWillAlsoBe")}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setDeleting(null)}>{t("settings.cancel")}</Button>
          <Button
            disabled={remove.isPending}
            className="text-status-failed"
            onClick={() => {
              if (deleting) remove.mutate(deleting);
            }}
          >
            {t("settings.delete")}
          </Button>
        </div>
      </Dialog>
      <Toast message={message} onClose={() => setMessage(null)} />
    </section>
  );
}
