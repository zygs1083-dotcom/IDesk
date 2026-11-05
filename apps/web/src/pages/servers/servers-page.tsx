import { SERVER_RANGES } from "@idesk/shared/server-schemas";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "../../components/button.tsx";
import { EmptyState } from "../../components/empty-state.tsx";
import { Menu } from "../../components/menu.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { relativeTime } from "../../lib/format.ts";
import { type ServerRange, useServerMetrics, useServers } from "../../lib/use-servers.ts";
import { useSession } from "../../lib/use-session.ts";
import { ServerDashboard } from "./server-dashboard.tsx";
import { installCommand, ServerDialog } from "./server-dialog.tsx";
import { ServerOverview } from "./server-overview.tsx";
import { OVERVIEW, ServerToolbar } from "./server-toolbar.tsx";

type DialogAction = "create" | "rename" | "rotate" | "delete";

export function ServersPage() {
  const { lang, t } = useLang();
  const { isAdmin } = useSession();
  const { data: servers = [], error, isPending, isFetching } = useServers();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogAction | null>(null);
  const [newToken, setNewToken] = useState<{ id: string; token: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const requested = params.get("server") || localStorage.getItem("servers.selected");
  const server = servers.find((entry) => entry.id === requested);
  const selected = server?.id ?? OVERVIEW;
  const requestedRange = params.get("range") || localStorage.getItem("servers.range");
  const range: ServerRange = SERVER_RANGES.find((item) => item === requestedRange) ?? "1h";
  const metrics = useServerMetrics(server?.id ?? "", range);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    // 新建后列表刷新前找不到新服务器，等刷新完再同步，免得被改回总览
    if (!servers.length || isFetching) return;
    localStorage.setItem("servers.selected", selected);
    localStorage.setItem("servers.range", range);
    if (params.get("server") !== selected || params.get("range") !== range)
      setParams({ server: selected, range }, { replace: true });
  }, [servers.length, isFetching, selected, range, params, setParams]);

  function select(serverId: string, selectedRange: ServerRange) {
    localStorage.setItem("servers.selected", serverId);
    localStorage.setItem("servers.range", selectedRange);
    setParams({ server: serverId, range: selectedRange });
  }

  const elapsed = server?.lastSeenAt
    ? Math.max(0, Math.floor((now - Date.parse(server.lastSeenAt)) / 1000))
    : 0;
  const lastSeen = !server?.lastSeenAt
    ? "—"
    : elapsed < 60
      ? t("servers.secondsAgo", { seconds: elapsed })
      : relativeTime(new Date(server.lastSeenAt), lang);
  const online = servers.filter((entry) => entry.status === "online").length;
  const subtitle = !server
    ? servers.length
      ? t("servers.overviewSubtitle", {
          total: servers.length,
          online,
          offline: servers.length - online,
        })
      : t("servers.refresh")
    : !server.lastSeenAt
      ? t("servers.waiting")
      : server.status === "offline"
        ? t("servers.offlineSubtitle", { time: lastSeen })
        : t("servers.subtitle", { time: lastSeen });
  return (
    <div data-scene="servers" data-status={server?.status} className="space-y-4">
      <PageHeader
        title={t("nav.servers")}
        subtitle={subtitle}
        toolbar={
          servers.length > 0 && (
            <ServerToolbar servers={servers} selected={selected} range={range} onSelect={select} />
          )
        }
      >
        {isAdmin && (
          <>
            {server && (
              <Menu
                label={t("servers.manage")}
                trigger={t("servers.manage")}
                items={[
                  { label: t("servers.rename"), onSelect: () => setDialog("rename") },
                  { label: t("servers.rotate"), onSelect: () => setDialog("rotate") },
                  { label: t("servers.delete"), danger: true, onSelect: () => setDialog("delete") },
                ]}
              />
            )}
            <Button variant="primary" onClick={() => setDialog("create")}>
              {t("servers.add")}
            </Button>
          </>
        )}
      </PageHeader>
      {error && (
        <p role="alert" className="text-status-failed">
          {error.message}
        </p>
      )}
      {!isPending && !error && !servers.length && (
        <EmptyState
          title={t("servers.empty")}
          description={t("servers.emptyDescription")}
          scene="plug"
          action={
            isAdmin ? { label: t("servers.add"), onClick: () => setDialog("create") } : undefined
          }
          legacyPrimary
        />
      )}
      {!server && servers.length > 0 && (
        <ServerOverview
          servers={servers}
          range={range}
          now={now}
          onOpen={(serverId) => select(serverId, range)}
        />
      )}
      {server && metrics.error && (
        <p role="alert" className="text-status-failed">
          {metrics.error.message}
        </p>
      )}
      {server && metrics.data && !metrics.data.latest && (
        <section
          data-ui="server-waiting"
          className="rounded-card border border-line bg-surface p-8 text-center shadow-card"
        >
          <h2 className="text-section">{t("servers.waiting")}</h2>
          <p className="mt-2 text-secondary text-text-2">{t("servers.installHint")}</p>
          <code className="mt-4 block break-all rounded-control bg-surface-2 p-3 text-left text-secondary">
            {installCommand(newToken?.id === server.id ? newToken.token : "ids_…")}
          </code>
        </section>
      )}
      {server?.info && metrics.data?.latest && (
        <ServerDashboard
          info={server.info}
          latest={metrics.data.latest}
          metrics={metrics.data}
          range={range}
        />
      )}
      {dialog && isAdmin && (
        <ServerDialog
          action={dialog}
          server={server}
          onClose={() => setDialog(null)}
          onCreated={(created, token) => {
            setNewToken({ id: created.id, token });
            select(created.id, range);
          }}
        />
      )}
    </div>
  );
}
