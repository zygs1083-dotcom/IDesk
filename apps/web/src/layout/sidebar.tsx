import type { Lang } from "@idesk/shared/labels";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Building2,
  Clock,
  LayoutGrid,
  PencilRuler,
  Send,
  Settings,
  Workflow,
} from "lucide-react";
import { NavLink } from "react-router";
import { useLang } from "../i18n/lang.tsx";
import { cn } from "../lib/cn.ts";
import { logout } from "../lib/logout.ts";
import { useAgents } from "../lib/use-agents.ts";
import { useSession } from "../lib/use-session.ts";
import { RelayBadge } from "../pages/relay/relay-badge.tsx";
import { AgentPhoto } from "./agent-photo.tsx";

const otherLang: Record<Lang, Lang> = { zh: "en", en: "zh" };
const languageClasses = {
  en: { en: "text-text", zh: "text-text-2" },
  zh: { en: "text-text-2", zh: "text-text" },
};

export function Sidebar() {
  const { lang, setLang, t } = useLang();
  const items = [
    { to: "/desk", label: t("nav.desk"), icon: LayoutGrid },
    { to: "/relay", label: t("nav.relay"), icon: Send },
    { to: "/automation", label: t("nav.automation"), icon: Workflow },
    { to: "/agents", label: t("nav.agents"), icon: Bot },
    { to: "/schedules", label: t("nav.schedules"), icon: Clock },
    { to: "/activity", label: t("nav.activity"), icon: Activity },
    { to: "/settings", label: t("nav.settings"), icon: Settings },
  ];
  const { agents } = useAgents();
  const { data: session } = useSession();
  const client = useQueryClient();
  const leave = useMutation({ mutationFn: () => logout(client) });
  const { data: meta } = useQuery<{ office: boolean }>({
    queryKey: ["meta"],
    queryFn: async () => {
      const response = await fetch("/api/meta");
      if (!response.ok) throw new Error(t("nav.metaLoadFailed"));
      return response.json();
    },
  });
  const online = agents.filter((agent) => agent.status === "online").length;
  return (
    <aside
      data-ui="sidebar"
      className="flex flex-wrap shrink-0 items-center border-b border-line bg-surface sidebar:w-sidebar sidebar:flex-col sidebar:flex-nowrap sidebar:items-stretch sidebar:border-r sidebar:border-b-0"
    >
      <div data-ui="brand" className="hidden px-5 pt-5 pb-4 text-section sidebar:block">
        <PencilRuler className="skin-mark" size={20} strokeWidth={1.5} aria-hidden="true" />
        IDesk
      </div>
      <nav
        aria-label={t("nav.main")}
        className="flex gap-0 p-2 sidebar:flex-col sidebar:gap-1 sidebar:px-3 sidebar:py-0"
      >
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-control p-2.5 text-body transition-colors duration-hover ease-hover sidebar:px-3 sidebar:py-2",
                isActive ? "bg-line text-text" : "text-text-2 hover:text-text",
              )
            }
          >
            <Icon aria-hidden="true" size={16} strokeWidth={1.5} />
            <span className="sr-only sidebar:not-sr-only">{label}</span>
            {to === "/relay" && <RelayBadge />}
          </NavLink>
        ))}
        {meta?.office && (
          <a
            href="/office/"
            aria-label={t("nav.office")}
            title={t("nav.office")}
            className="flex items-center gap-2 rounded-control p-2.5 text-body text-text-2 transition-colors duration-hover ease-hover hover:text-text sidebar:px-3 sidebar:py-2"
          >
            <Building2 aria-hidden="true" size={16} strokeWidth={1.5} />
            <span className="hidden sidebar:inline">{t("nav.office")}</span>
          </a>
        )}
      </nav>
      <AgentPhoto />
      <div
        data-ui="sidebar-footer"
        className="ml-auto flex flex-wrap shrink-0 items-center gap-2 pr-2 text-secondary text-text-2 sidebar:mt-auto sidebar:ml-0 sidebar:px-5 sidebar:py-4"
      >
        <span
          className={cn(
            "hidden size-2 rounded-full sidebar:block",
            online > 0 ? "bg-status-done" : "bg-status-open",
          )}
        />
        <span className="hidden sidebar:inline">
          {online} {t("common.online")}
        </span>
        <button
          type="button"
          aria-label={t("nav.switchLanguage")}
          onClick={() => setLang(otherLang[lang])}
          className="shrink-0 whitespace-nowrap text-secondary"
        >
          <span className={languageClasses.en[lang]}>EN</span>
          {" / "}
          <span className={languageClasses.zh[lang]}>中</span>
        </button>
        <button
          type="button"
          disabled={leave.isPending}
          onClick={() => leave.mutate()}
          className="order-last shrink-0 whitespace-nowrap text-left text-secondary hover:text-text sidebar:w-full sidebar:pt-2"
        >
          {t("nav.logout")}
        </button>
        {leave.error && (
          <span role="alert" className="text-status-failed">
            {leave.error.message}
          </span>
        )}
        {session?.role === "viewer" && (
          <span className="rounded-control border border-line px-2 py-1">{t("nav.readOnly")}</span>
        )}
      </div>
    </aside>
  );
}
