import { Activity, Bot, Clock, LayoutGrid, Send, Settings, Workflow } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "../lib/cn.ts";

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
  return (
    <aside className="flex shrink-0 items-center border-b border-line bg-surface sidebar:w-sidebar sidebar:flex-col sidebar:items-stretch sidebar:border-r sidebar:border-b-0">
      <div className="hidden px-5 pt-5 pb-4 text-section sidebar:block">IDesk</div>
      <nav
        aria-label="主导航"
        className="flex gap-2 p-3 sidebar:flex-col sidebar:gap-1 sidebar:py-0"
      >
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            title={label}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-control p-3 text-body transition-colors duration-hover ease-hover sidebar:px-3 sidebar:py-2",
                isActive ? "bg-surface-2 text-text" : "text-text-2 hover:text-text",
              )
            }
          >
            <Icon aria-hidden="true" size={16} strokeWidth={1.5} />
            <span className="hidden sidebar:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
