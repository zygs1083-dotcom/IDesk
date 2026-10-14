import { Activity, Bot, Clock, LayoutGrid, Send, Settings, Workflow } from "lucide-react";
import { NavLink } from "react-router";

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
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-5 pt-5 pb-4 text-[15px] font-semibold tracking-[-0.01em]">IDesk</div>
      <nav className="flex flex-col gap-0.5 px-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors duration-[120ms] ${
                isActive ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface-2"
              }`
            }
          >
            <Icon size={16} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-2 px-5 py-4 text-[13px] text-text-2">
        <span className="h-2 w-2 rounded-full bg-[var(--status-done)]" />0 在线
      </div>
    </aside>
  );
}
