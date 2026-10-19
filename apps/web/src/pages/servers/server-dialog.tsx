import type { createdServerSchema } from "@idesk/shared/server-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Server } from "../../lib/use-servers.ts";

type Action = "create" | "rename" | "rotate" | "delete";

export function installCommand(token: string, local = false): string {
  const url = window.location.origin;
  return `curl -fsSL ${url}/api/probe/v1/install.sh | sudo ${local ? "IDESK_URL=http://127.0.0.1:3300 " : ""}IDESK_PROBE_TOKEN=${token} sh`;
}

export function ServerDialog({
  action,
  server,
  onClose,
  onCreated,
}: {
  action: Action;
  server: Server | undefined;
  onClose: () => void;
  onCreated: (server: Server, token: string) => void;
}) {
  const { t } = useLang();
  const client = useQueryClient();
  const [name, setName] = useState(action === "rename" ? (server?.name ?? "") : "");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState<"normal" | "local" | null>(null);
  const [copyError, setCopyError] = useState("");
  const mutate = useMutation({
    mutationFn: async () => {
      if (action === "create")
        return request<z.infer<typeof createdServerSchema>>("/servers", {
          method: "POST",
          body: JSON.stringify({ name: name.trim() }),
        });
      if (action === "rename")
        return request<Server>(`/servers/${server?.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim() }),
        });
      if (action === "rotate")
        return request<z.infer<typeof createdServerSchema>>(`/servers/${server?.id}/rotate-token`, {
          method: "POST",
        });
      return request<void>(`/servers/${server?.id}`, { method: "DELETE" });
    },
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["servers"] });
      if (action === "create" || action === "rotate") {
        const created = result as z.infer<typeof createdServerSchema>;
        setToken(created.token);
        onCreated(created.server, created.token);
      } else onClose();
    },
  });
  async function copy(command: string, which: "normal" | "local") {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(which);
      setCopyError("");
    } catch {
      setCopyError(t("servers.copyFailed"));
    }
  }
  const title =
    action === "create"
      ? token
        ? t("servers.created")
        : t("servers.add")
      : action === "rename"
        ? t("servers.rename")
        : action === "rotate"
          ? token
            ? t("servers.rotated")
            : t("servers.rotate")
          : t("servers.delete");
  const formId = `server-${action}-form`;
  const footer = token ? (
    <Button variant="primary" onClick={onClose}>
      {t("common.complete")}
    </Button>
  ) : (
    <>
      <Button onClick={onClose}>{t("common.cancel")}</Button>
      <Button
        type={action === "create" || action === "rename" ? "submit" : "button"}
        form={action === "create" || action === "rename" ? formId : undefined}
        variant={action === "rotate" || action === "delete" ? "danger" : "primary"}
        disabled={
          mutate.isPending || ((action === "create" || action === "rename") && !name.trim())
        }
        onClick={action === "rotate" || action === "delete" ? () => mutate.mutate() : undefined}
      >
        {action === "delete" ? t("common.delete") : t("common.confirm")}
      </Button>
    </>
  );
  return (
    <Dialog open title={title} onClose={onClose} footer={footer}>
      {token ? (
        <div className="space-y-3">
          <p className="text-secondary text-text-2">{t("servers.tokenOnce")}</p>
          <p className="text-label text-text-2">{t("servers.install")}</p>
          <code className="block break-all rounded-control bg-surface-2 p-3 text-secondary">
            {installCommand(token)}
          </code>
          <Button onClick={() => copy(installCommand(token), "normal")}>
            {copied === "normal" ? t("common.copied") : t("common.copy")}
          </Button>
          <p className="text-label text-text-2">{t("servers.localInstall")}</p>
          <code className="block break-all rounded-control bg-surface-2 p-3 text-secondary">
            {installCommand(token, true)}
          </code>
          <Button onClick={() => copy(installCommand(token, true), "local")}>
            {copied === "local" ? t("common.copied") : t("common.copy")}
          </Button>
        </div>
      ) : action === "create" || action === "rename" ? (
        <form
          id={formId}
          onSubmit={(event) => {
            event.preventDefault();
            mutate.mutate();
          }}
        >
          <Field
            label={t("common.name")}
            value={name}
            maxLength={40}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </form>
      ) : (
        <p className="text-secondary text-text-2">
          {action === "rotate" ? t("servers.rotateWarning") : t("servers.deleteWarning")}
        </p>
      )}
      {(mutate.error || copyError) && (
        <p role="alert" className="mt-3 text-secondary text-status-failed">
          {mutate.error?.message || copyError}
        </p>
      )}
      <div className="pixel-legacy mt-4 flex justify-end gap-2">{footer}</div>
    </Dialog>
  );
}
