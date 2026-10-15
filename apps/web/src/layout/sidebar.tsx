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
import { useLang } from "../i18n/lang.tsx";
import { request } from "../lib/api.ts";
import { cn } from "../lib/cn.ts";
import { useAgents } from "../lib/use-agents.ts";

export function Sidebar() {
  const { lang, setLang, t } = useLang();
  const items = [
    { to: "/desk", label: t("sidebar.desk"), icon: LayoutGrid },
    { to: "/relay", label: t("sidebar.relay"), icon: Send },
    { to: "/automation", label: t("sidebar.automation"), icon: Workflow },
    { to: "/agents", label: t("sidebar.agents"), icon: Bot },
    { to: "/schedules", label: t("sidebar.schedules"), icon: Clock },
    { to: "/activity", label: t("sidebar.activity"), icon: Activity },
    { to: "/settings", label: t("sidebar.settings"), icon: Settings },
  ];
  const { agents } = useAgents();
  const { data: session } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => request<{ role: "admin" | "viewer" }>("/auth/me"),
  });
  const { data: meta } = useQuery<{ office: boolean }>({
    queryKey: ["meta"],
    queryFn: async () => {
      const response = await fetch("/api/meta");
      if (!response.ok) throw new Error(t("sidebar.couldNotLoadDeploymentInformation"));
      return response.json();
    },
  });
  const online = agents.filter((agent) => agent.status === "online").length;
  return (
    <aside className="flex shrink-0 items-center border-b border-line bg-surface sidebar:w-sidebar sidebar:flex-col sidebar:items-stretch sidebar:border-r sidebar:border-b-0">
      <div className="hidden px-5 pt-5 pb-4 text-section sidebar:block">IDesk</div>
      <nav
        aria-label={t("sidebar.mainNavigation")}
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
            aria-label={t("sidebar.pixelOffice")}
            title={t("sidebar.pixelOffice")}
            className="flex items-center gap-2 rounded-control p-2.5 text-body text-text-2 transition-colors duration-hover ease-hover hover:text-text sidebar:px-3 sidebar:py-2"
          >
            <Building2 aria-hidden="true" size={16} strokeWidth={1.5} />
            <span className="hidden sidebar:inline">{t("sidebar.pixelOffice")}</span>
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
        <span className="hidden sidebar:inline">
          {online} {t("sidebar.online")}
        </span>
        <button
          type="button"
          aria-label={t("sidebar.switchLanguage")}
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className="shrink-0 whitespace-nowrap text-secondary"
        >
          <span className={lang === "en" ? "text-text" : "text-text-2"}>EN</span>
          {" / "}
          <span className={lang === "zh" ? "text-text" : "text-text-2"}>中</span>
        </button>
        {session?.role === "viewer" && (
          <span className="rounded-control border border-line px-2 py-1">
            {t("sidebar.readOnly")}
          </span>
        )}
      </div>
    </aside>
  );
}
