import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Agent } from "../../lib/types.ts";

export function DeleteAgent({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t } = useLang();
  const client = useQueryClient();
  const remove = useMutation({
    mutationFn: () => request<void>(`/agents/${agent.id}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["agents"] });
      void client.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });
  return (
    <Dialog open title={t("agents.deleteAgent")} onClose={onClose}>
      <p className="text-secondary text-text-2">{t("agents.deleteWarning")}</p>
      {remove.error && (
        <p role="alert" className="mt-4 text-secondary text-status-failed">
          {remove.error.message}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>{t("agents.cancel")}</Button>
        <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
          {t("agents.delete")}
        </Button>
      </div>
    </Dialog>
  );
}
