import { Plug } from "lucide-react";
import { Menu } from "../../components/menu.tsx";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import type { Connector } from "./types.ts";

export function ConnectorRow({
  connector,
  busy,
  onTest,
  onToggle,
  onDelete,
  onEdit,
}: {
  connector: Connector;
  busy: boolean;
  onTest: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const status = !connector.enabled ? "已停用" : connector.lastError || "正常";
  return (
    <div className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0">
      <Plug aria-hidden="true" size={18} strokeWidth={1.5} className="shrink-0 text-text-2" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body">{connector.name}</p>
        {typeof connector.config.baseUrl === "string" && (
          <p className="truncate text-secondary text-text-2" title={connector.config.baseUrl}>
            {connector.config.baseUrl}
          </p>
        )}
      </div>
      <div className="flex w-40 min-w-0 items-center gap-2 text-secondary" title={status}>
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            !connector.enabled
              ? "bg-status-open"
              : connector.lastError
                ? "bg-status-failed"
                : "bg-status-done",
          )}
        />
        <span
          className={cn(
            "truncate",
            connector.enabled && connector.lastError ? "text-status-failed" : "text-text-2",
          )}
        >
          {status}
        </span>
      </div>
      <span
        className="hidden w-24 text-right text-secondary tabular-nums text-text-2 sm:block"
        title="上次轮询"
      >
        {connector.lastPolledAt ? relativeTime(new Date(connector.lastPolledAt)) : "—"}
      </span>
      <Menu
        label={`连接器 ${connector.name} 操作`}
        disabled={busy}
        items={[
          { label: "测试", onSelect: onTest },
          { label: "编辑", onSelect: onEdit },
          { label: connector.enabled ? "停用" : "启用", onSelect: onToggle },
          { label: "删除", onSelect: onDelete, danger: true },
        ]}
      />
    </div>
  );
}
