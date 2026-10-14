import { NavLink, Outlet } from "react-router";
import { PageHeader } from "../../layout/page-header.tsx";
import { cn } from "../../lib/cn.ts";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="设置" />
      <div className="flex flex-col gap-6 sidebar:flex-row">
        <nav aria-label="设置导航" className="flex shrink-0 gap-1 sidebar:w-40 sidebar:flex-col">
          {[
            ["connectors", "连接器"],
            ["plugins", "插件"],
            ["access", "接入信息"],
          ].map(([path, label]) => (
            <NavLink
              key={path}
              to={`/settings/${path}`}
              className={({ isActive }) =>
                cn(
                  "rounded-control px-3 py-2 text-body transition-colors duration-hover ease-hover",
                  isActive ? "bg-line text-text" : "text-text-2 hover:text-text",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
