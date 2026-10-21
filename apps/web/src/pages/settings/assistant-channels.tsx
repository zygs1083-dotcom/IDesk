import type { AssistantChannelStatus } from "@idesk/shared/assistant-schemas";
import { IM_CHANNELS } from "@idesk/shared/people-schemas";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";

export function AssistantChannels({ admin }: { admin: boolean }) {
  const { lang, t } = useLang();
  const channels = useQuery({
    queryKey: ["assistant", "channels"],
    queryFn: () => request<AssistantChannelStatus[]>("/assistant/channels"),
    refetchInterval: 30_000,
  });
  return (
    <section aria-label={t("assistant.channels")} className="space-y-3">
      <h3 data-ui="fixed-label" className="text-section">
        {t("assistant.channels")}
      </h3>
      {channels.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {channels.error.message}
        </p>
      )}
      <div className="divide-y divide-line">
        {IM_CHANNELS.map((channel) => {
          const status = channels.data?.find((entry) => entry.channel === channel);
          return (
            <div
              data-ui="assistant-channel"
              key={channel}
              className="space-y-1 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-secondary">
                <span data-ui="fixed-label" className="text-body">
                  {t(`channel.${channel}`)}
                </span>
                <span
                  data-ui="fixed-label"
                  className={`min-w-0 break-words [overflow-wrap:anywhere] ${status?.enabled && !status.connected ? "text-status-failed" : "text-text-2"}`}
                >
                  {t(
                    !status
                      ? "common.loading"
                      : !status.enabled
                        ? "assistant.disabled"
                        : status.connected
                          ? "assistant.connected"
                          : "assistant.failed",
                  )}
                  {status?.enabled && !status.connected && status.lastError
                    ? t("assistant.reason", { reason: status.lastError })
                    : ""}
                </span>
                {admin && (
                  <Link
                    className="ml-auto text-accent hover:underline"
                    to={`/settings/plugins?plugin=${channel}`}
                  >
                    {t("settings.configure")}
                  </Link>
                )}
              </div>
              <p data-ui="fixed-label" className="text-secondary text-text-2">
                {t("assistant.lastMessage", {
                  time: status?.lastMessageAt
                    ? new Date(status.lastMessageAt).toLocaleString(lang)
                    : t("assistant.noMessages"),
                })}
              </p>
              <p data-ui="fixed-label" className="text-secondary text-text-2">
                {t(`assistant.${channel}Hint`)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
