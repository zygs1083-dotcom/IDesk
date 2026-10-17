import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Switch } from "../../components/switch.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { useSession } from "../../lib/use-session.ts";
import { configFields } from "./config-fields.ts";
import { PluginConfig } from "./plugin-config.tsx";
import type { Plugin } from "./types.ts";

export function PluginsPage() {
  const { isAdmin } = useSession();
  const { t } = useLang();
  const kinds = {
    connector: t("common.connectors"),
    notifier: t("settings.notifications"),
    action: t("common.action"),
  };
  const client = useQueryClient();
  const plugins = useQuery({ queryKey: ["plugins"], queryFn: () => request<Plugin[]>("/plugins") });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      request<Plugin>(`/plugins/${id}/${enabled ? "enable" : "disable"}`, { method: "POST" }),
    onMutate: async ({ id, enabled }) => {
      await client.cancelQueries({ queryKey: ["plugins"] });
      const previous = client.getQueryData<Plugin[]>(["plugins"]);
      client.setQueryData<Plugin[]>(["plugins"], (rows) =>
        rows?.map((plugin) => (plugin.id === id ? { ...plugin, enabled } : plugin)),
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      client.setQueryData(["plugins"], context?.previous);
      setMessage(error.message);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["plugins"] });
      void client.invalidateQueries({ queryKey: ["automation"] });
    },
  });
  const reload = useMutation({
    mutationFn: (plugin: Plugin) =>
      request<Plugin>(`/plugins/${plugin.id}/reload`, { method: "POST" }),
    onSuccess: (_result, plugin) => {
      setMessage(t("settings.reloaded", { name: plugin.name }));
      void client.invalidateQueries({ queryKey: ["plugins"] });
    },
    onError: (error) => setMessage(error.message),
  });
  return (
    <section className="space-y-4" aria-label={t("common.plugins")}>
      <h2 className="text-section">{t("common.plugins")}</h2>
      {plugins.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {plugins.error.message}
        </p>
      )}
      {plugins.isPending && <p className="text-secondary text-text-2">{t("common.loading")}</p>}
      {plugins.data?.length === 0 && (
        <p className="py-16 text-center text-secondary text-text-2">{t("settings.noPlugins")}</p>
      )}
      <div data-ui="panel" className="rounded-panel border border-line bg-surface">
        {plugins.data?.map((plugin) => (
          <div key={plugin.id} className="border-b border-line last:border-b-0">
            <div className="flex flex-wrap items-center gap-4 px-4 py-3">
              <span className="min-w-0 flex-1 break-words text-body">{plugin.name}</span>
              <span className="text-secondary tabular-nums text-text-2">{plugin.version}</span>
              <span className="w-12 text-secondary text-text-2">{kinds[plugin.kind]}</span>
              <Switch
                label={t("common.enableNamed", { name: plugin.name })}
                checked={plugin.enabled}
                disabled={!isAdmin || toggle.isPending || reload.isPending}
                onChange={(enabled) => toggle.mutate({ id: plugin.id, enabled })}
              />
              {isAdmin &&
                plugin.kind !== "connector" &&
                configFields(plugin.configSchema).length > 0 && (
                  <Button
                    className="border-0 text-accent"
                    aria-expanded={expanded === plugin.id}
                    onClick={() => setExpanded(expanded === plugin.id ? null : plugin.id)}
                  >
                    {t("settings.configure")}
                  </Button>
                )}
              <Button
                className="border-0 text-accent"
                disabled={!isAdmin || reload.isPending || toggle.isPending}
                onClick={() => reload.mutate(plugin)}
              >
                {t("settings.reload")}
              </Button>
            </div>
            {plugin.error && (
              <p role="alert" className="px-4 pb-3 text-secondary text-status-failed">
                {plugin.error}
              </p>
            )}
            {isAdmin && expanded === plugin.id && (
              <PluginConfig plugin={plugin} onClose={() => setExpanded(null)} />
            )}
          </div>
        ))}
      </div>
      <Toast message={message} onClose={() => setMessage(null)} />
    </section>
  );
}
