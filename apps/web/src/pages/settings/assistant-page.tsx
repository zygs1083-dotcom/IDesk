import { useLang } from "../../i18n/lang.tsx";
import { useSession } from "../../lib/use-session.ts";
import { AssistantChannels } from "./assistant-channels.tsx";
import { AssistantChat } from "./assistant-chat.tsx";
import { AssistantModel } from "./assistant-model.tsx";

export function AssistantPage() {
  const { t } = useLang();
  const { isAdmin } = useSession();
  return (
    <section aria-label={t("settings.assistant")} className="min-w-0 space-y-4">
      <h2 data-ui="fixed-label" className="text-section">
        {t("settings.assistant")}
      </h2>
      <div
        data-ui="panel"
        className="divide-y divide-line rounded-panel border border-line bg-surface px-4 [&>section]:py-4"
      >
        {isAdmin && <AssistantModel />}
        <AssistantChannels admin={isAdmin} />
        {isAdmin && <AssistantChat />}
      </div>
    </section>
  );
}
