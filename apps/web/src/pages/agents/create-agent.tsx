import {
  AGENT_KINDS,
  type registerAgentSchema,
  type registeredAgentSchema,
} from "@idesk/shared/agent-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { request } from "../../lib/api.ts";

export function CreateAgent({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<z.infer<typeof registerAgentSchema>["kind"]>("codex");
  const [host, setHost] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const create = useMutation({
    mutationFn: (input: z.infer<typeof registerAgentSchema>) =>
      request<z.infer<typeof registeredAgentSchema>>("/agents", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["agents"] }),
  });
  async function copyKey() {
    if (!create.data) return;
    try {
      await navigator.clipboard.writeText(create.data.apiKey);
      setCopyError("");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("复制失败，请选中密钥复制");
    }
  }
  return (
    <Dialog open onClose={onClose} title={create.data ? "智能体已新建" : "新建智能体"}>
      {create.data ? (
        <div className="space-y-4">
          <code className="block break-all rounded-control bg-surface-2 p-3 text-secondary">
            {create.data.apiKey}
          </code>
          <p className="text-secondary text-text-2">只显示这一次</p>
          {copyError && (
            <p role="alert" className="text-secondary text-status-failed">
              {copyError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={copyKey}>{copied ? "已复制" : "复制"}</Button>
            <Button variant="primary" onClick={onClose}>
              完成
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({
              name: name.trim(),
              kind,
              host: host.trim(),
              capabilities: capabilities.split(/[\s,，]+/).filter(Boolean),
            });
          }}
        >
          <Field label="名称" value={name} onChange={(event) => setName(event.target.value)} />
          <label className="block space-y-2 text-secondary text-text-2">
            kind
            <select
              className="block w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text focus:border-accent"
              value={kind}
              onChange={(event) => setKind(event.target.value as typeof kind)}
            >
              {AGENT_KINDS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <Field label="主机" value={host} onChange={(event) => setHost(event.target.value)} />
          <Field
            label="能力"
            placeholder="空格或逗号分隔"
            value={capabilities}
            onChange={(event) => setCapabilities(event.target.value)}
          />
          {create.error && (
            <p role="alert" className="text-secondary text-status-failed">
              {create.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>取消</Button>
            <Button type="submit" variant="primary" disabled={!name.trim() || create.isPending}>
              确定
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
