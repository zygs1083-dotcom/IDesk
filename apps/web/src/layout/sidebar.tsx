import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Building2,
  Clock,
  LayoutGrid,
  Send,
  Settings,
  Workflow,
} from "lucide-react";
import { NavLink } from "react-router";
import { request } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { useAgents } from "../lib/use-agents.ts";

const items = [
  { to: "/desk", label: "协作台", icon: LayoutGrid },
  { to: "/relay", label: "传递区", icon: Send },
  { to: "/automation", label: "自动化", icon: Workflow },
  { to: "/agents", label: "智能体", icon: Bot },
  { to: "/schedules", label: "定时", icon: Clock },
  { to: "/activity", label: "活动", icon: Activity },
  { to: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const { agents } = useAgents();
  const { data: session } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => request<{ role: "admin" | "viewer" }>("/auth/me"),
  });
  const { data: meta } = useQuery<{ office: boolean }>({
    queryKey: ["meta"],
    queryFn: async () => {
      const response = await fetch("/api/meta");
      if (!response.ok) throw new Error("部署信息加载失败");
      return response.json();
    },
  });
  const online = agents.filter((agent) => agent.status === "online").length;
  return (
    <aside className="flex shrink-0 items-center border-b border-line bg-surface sidebar:w-sidebar sidebar:flex-col sidebar:items-stretch sidebar:border-r sidebar:border-b-0">
      <div className="hidden px-5 pt-5 pb-4 text-section sidebar:block">IDesk</div>
      <nav
        aria-label="主导航"
        className="flex gap-0 p-2 sidebar:flex-col sidebar:gap-1 sidebar:px-3 sidebar:py-0"
      >
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            title={label}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-control p-2.5 text-body transition-colors duration-hover ease-hover sidebar:px-3 sidebar:py-2",
                isActive ? "bg-line text-text" : "text-text-2 hover:text-text",
              )
            }
          >
            <Icon aria-hidden="true" size={16} strokeWidth={1.5} />
            <span className="hidden sidebar:inline">{label}</span>
          </NavLink>
        ))}
        {meta?.office && (
          <a
            href="/office/"
            aria-label="像素办公室"
            title="像素办公室"
            className="flex items-center gap-2 rounded-control p-2.5 text-body text-text-2 transition-colors duration-hover ease-hover hover:text-text sidebar:px-3 sidebar:py-2"
          >
            <Building2 aria-hidden="true" size={16} strokeWidth={1.5} />
            <span className="hidden sidebar:inline">像素办公室</span>
          </a>
        )}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2 pr-2 text-secondary text-text-2 sidebar:mt-auto sidebar:ml-0 sidebar:px-5 sidebar:py-4">
        <span
          className={cn(
            "hidden size-2 rounded-full sidebar:block",
            online > 0 ? "bg-status-done" : "bg-status-open",
          )}
        />
        <span className="hidden sidebar:inline">{online} 在线</span>
        {session?.role === "viewer" && (
          <span className="rounded-control border border-line px-2 py-1">只读</span>
        )}
      </div>
    </aside>
  );
}
