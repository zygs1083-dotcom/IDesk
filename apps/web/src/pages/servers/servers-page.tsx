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
import { ServerToolbar } from "./server-toolbar.tsx";

type DialogAction = "create" | "rename" | "rotate" | "delete";

export function ServersPage() {
  const { lang, t } = useLang();
  const { isAdmin } = useSession();
  const { data: servers = [], error, isPending } = useServers();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogAction | null>(null);
  const [newToken, setNewToken] = useState<{ id: string; token: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const requested = params.get("server") || localStorage.getItem("servers.selected");
  const server = servers.find((entry) => entry.id === requested) ?? servers[0];
  const requestedRange = params.get("range") || localStorage.getItem("servers.range");
  const range: ServerRange = SERVER_RANGES.find((item) => item === requestedRange) ?? "1h";
  const metrics = useServerMetrics(server?.id ?? "", range);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!server) return;
    localStorage.setItem("servers.selected", server.id);
    localStorage.setItem("servers.range", range);
    if (params.get("server") !== server.id || params.get("range") !== range)
      setParams({ server: server.id, range }, { replace: true });
  }, [server, range, params, setParams]);

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
  const subtitle = server
    ? !server.lastSeenAt
      ? t("servers.waiting")
      : server.status === "offline"
        ? t("servers.offlineSubtitle", { time: lastSeen })
        : t("servers.subtitle", { time: lastSeen })
    : t("servers.refresh");
  return (
    <div data-scene="servers" data-status={server?.status} className="space-y-4">
      <PageHeader
        title={t("nav.servers")}
        subtitle={subtitle}
        toolbar={
          server && (
            <ServerToolbar servers={servers} server={server} range={range} onSelect={select} />
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
      {!isPending && !error && !server && (
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
