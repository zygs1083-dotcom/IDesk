import { NavLink, Outlet } from "react-router";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { cn } from "../../lib/cn.ts";

export function SettingsPage() {
  const { t } = useLang();
  return (
    <div data-scene="settings" className="space-y-6">
      <PageHeader title={t("nav.settings")} />
      <div data-ui="settings-book" className="flex flex-col gap-6 sidebar:flex-row">
        <nav
          data-ui="settings-tabs"
          aria-label={t("settings.navigation")}
          className="flex shrink-0 flex-wrap gap-1 sidebar:w-40 sidebar:flex-col"
        >
          {[
            ["connectors", t("common.connectors")],
            ["plugins", t("common.plugins")],
            ["people", t("settings.people")],
            ["assistant", t("settings.assistant")],
            ["access", t("settings.access")],
            ["appearance", t("settings.appearance")],
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
        <div data-ui="settings-sheet" className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
