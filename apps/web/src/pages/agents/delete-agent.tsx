import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { request } from "../../lib/api.ts";
import type { Agent } from "../../lib/types.ts";

export function DeleteAgent({ agent, onClose }: { agent: Agent; onClose: () => void }) {
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
    <Dialog open title="删除智能体" onClose={onClose}>
      <p className="text-secondary text-text-2">删除后它的任务和历史保留，key 立即失效</p>
      {remove.error && (
        <p role="alert" className="mt-4 text-secondary text-status-failed">
          {remove.error.message}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>取消</Button>
        <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
          删除
        </Button>
      </div>
    </Dialog>
  );
}
