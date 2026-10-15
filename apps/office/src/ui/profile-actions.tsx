import { type FormEvent, useState } from "react";
import { useLang } from "../i18n/lang.tsx";
import { request } from "../lib/api.ts";
import { PixelButton } from "./pixel-button.tsx";
import type { Task } from "./use-office-data.ts";

type Action = "assign" | "publish" | "message";
export function ProfileActions({
  agentId,
  tasks,
  onSuccess,
}: {
  agentId: string;
  tasks: Task[];
  onSuccess: (message: string) => void;
}) {
  const { t } = useLang();
  const [errors, setErrors] = useState<Partial<Record<Action, string>>>({});
  const [pending, setPending] = useState<Partial<Record<Action, boolean>>>({});
  const open = tasks.filter((task) => task.status === "open");
  const submit = (event: FormEvent<HTMLFormElement>, action: Action) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const body = String(data.get("body") ?? "");
    const path =
      action === "assign"
        ? `/tasks/${encodeURIComponent(String(data.get("task")))}/actions/assign`
        : action === "publish"
          ? "/tasks"
          : "/relay";
    const payload =
      action === "assign"
        ? { agentId }
        : action === "publish"
          ? { title, body, dispatch: { type: "assign", agentId } }
          : { to: { kind: "agent", id: agentId }, kind: "note", subject: title, body };
    setErrors((current) => ({ ...current, [action]: "" }));
    setPending((current) => ({ ...current, [action]: true }));
    void request(path, { method: "POST", body: JSON.stringify(payload) })
      .then(() => {
        form.reset();
        const success = {
          assign: "profile.assigned",
          publish: "profile.published",
          message: "profile.sent",
        } as const;
        onSuccess(t(success[action]));
      })
      .catch((reason: Error) => setErrors((current) => ({ ...current, [action]: reason.message })))
      .finally(() => setPending((current) => ({ ...current, [action]: false })));
  };
  return (
    <section className="profile-actions" aria-label={t("profile.actions")}>
      <details>
        <summary>{t("profile.assignTask")}</summary>
        {open.length ? (
          <form onSubmit={(event) => submit(event, "assign")}>
            <label>
              {t("profile.assignTask")}
              <select name="task" required defaultValue="">
                <option value="" disabled>
                  {t("profile.chooseTask")}
                </option>
                {open.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
            <PixelButton type="submit" disabled={pending.assign}>
              {t("profile.assign")}
            </PixelButton>
          </form>
        ) : (
          <p>{t("profile.noOpenTasks")}</p>
        )}
        {errors.assign && <p role="alert">{errors.assign}</p>}
      </details>
      <details>
        <summary>{t("profile.publishAssign")}</summary>
        <form onSubmit={(event) => submit(event, "publish")}>
          <label>
            {t("profile.subject")}
            <input name="title" required pattern=".*\S.*" />
          </label>
          <label>
            {t("profile.body")}
            <textarea name="body" rows={3} />
          </label>
          <PixelButton type="submit" disabled={pending.publish}>
            {t("profile.publishAssign")}
          </PixelButton>
        </form>
        {errors.publish && <p role="alert">{errors.publish}</p>}
      </details>
      <details>
        <summary>{t("profile.sendMessage")}</summary>
        <form onSubmit={(event) => submit(event, "message")}>
          <label>
            {t("profile.subject")}
            <input name="title" required pattern=".*\S.*" />
          </label>
          <label>
            {t("profile.body")}
            <textarea name="body" rows={3} />
          </label>
          <PixelButton type="submit" disabled={pending.message}>
            {t("profile.sendMessage")}
          </PixelButton>
        </form>
        {errors.message && <p role="alert">{errors.message}</p>}
      </details>
    </section>
  );
}
