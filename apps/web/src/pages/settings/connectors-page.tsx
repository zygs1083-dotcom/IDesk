import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Toast } from "../../components/toast.tsx";
import { request } from "../../lib/api.ts";
import { ConnectorDialog } from "./connector-dialog.tsx";
import { ConnectorRow } from "./connector-row.tsx";
import type { ConnectionResult, Connector, Plugin } from "./types.ts";

export function ConnectorsPage() {
  const client = useQueryClient();
  const connectors = useQuery({
    queryKey: ["automation", "connectors"],
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
    onSuccess: (result) => setMessage(result.success ? "连接正常" : (result.error ?? null)),
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
  const error = connectors.error ?? plugins.error;
  return (
    <section className="space-y-4" aria-label="连接器">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-section">连接器</h2>
        <Button variant="primary" disabled={!plugins.data} onClick={() => setCreating(true)}>
          添加连接器
        </Button>
      </header>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {connectors.isPending && <p className="text-secondary text-text-2">加载中…</p>}
      {connectors.data?.length === 0 && (
        <div className="py-16 text-center text-secondary text-text-2">
          <p>还没有连接器</p>
          <Button className="mt-3" disabled={!plugins.data} onClick={() => setCreating(true)}>
            添加连接器
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
        title={`删除连接器 ${deleting?.name ?? ""}？`}
        onClose={() => setDeleting(null)}
      >
        <p className="text-secondary text-text-2">它的工作流与运行记录会一起删除</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setDeleting(null)}>取消</Button>
          <Button
            disabled={remove.isPending}
            className="text-status-failed"
            onClick={() => {
              if (deleting) remove.mutate(deleting);
            }}
          >
            删除
          </Button>
        </div>
      </Dialog>
      <Toast message={message} onClose={() => setMessage(null)} />
    </section>
  );
}
