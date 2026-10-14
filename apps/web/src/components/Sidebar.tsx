import { NavLink } from "react-router";
import { useRelay } from "../lib/queries.ts";

const items = [
  { to: "/", label: "调度台", icon: "▦" },
  { to: "/automation", label: "自动化", icon: "⟳" },
  { to: "/relay", label: "传递区", icon: "✉" },
  { to: "/agents", label: "设备与 AI", icon: "◎" },
  { to: "/schedules", label: "定时任务", icon: "◷" },
  { to: "/activity", label: "活动", icon: "≡" },
  { to: "/settings", label: "设置", icon: "⚙" },
];

export function Sidebar() {
  const relay = useRelay("inbox");
  const unread = relay.data?.unread ?? 0;
  return (
    <aside className="glass w-[232px] shrink-0 h-full border-r border-line flex flex-col px-3 py-4 gap-1">
      <div className="flex items-center gap-2.5 px-2 pb-4">
        <div className="size-8 rounded-[9px] bg-blue grid place-items-center text-white font-bold text-sm shadow-card">ID</div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight">IDesk</div>
          <div className="text-[11px] text-ink-3">Intelligent Dispatching Desk</div>
        </div>
      </div>
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === "/"}
          className={({ isActive }) =>
            `flex items-center gap-2.5 h-9 px-2.5 rounded-[10px] text-[14px] font-medium transition-colors ${
              isActive ? "bg-blue text-white shadow-card" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`
          }
        >
          <span className="w-5 text-center text-[15px] opacity-90">{it.icon}</span>
          <span className="flex-1">{it.label}</span>
          {it.to === "/relay" && unread > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-red text-white text-[11px] font-semibold grid place-items-center">{unread}</span>
          )}
        </NavLink>
      ))}
      <div className="mt-auto px-2 text-[11px] text-ink-3">v0.1 · M1 骨架</div>
    </aside>
  );
}
