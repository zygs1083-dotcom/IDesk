import type { TaskPriority } from "@idesk/shared/task-status";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "../../components/button.tsx";
import { CapabilityPicker } from "../../components/capability-picker.tsx";
import { ClaimableHint } from "../../components/claimable-hint.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Task } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { DispatchFields } from "./dispatch-fields.tsx";
import { usePublishCloseGuard } from "./publish-close-guard.tsx";
import { PublishPriority } from "./publish-priority.tsx";
import { PublishTemplates } from "./publish-templates.tsx";
import { PublisherSelect, usePublisher } from "./publisher-select.tsx";

export type PublishSeed = Pick<Task, "title" | "body" | "priority" | "tags" | "capabilities">;

export function PublishDialog({ onClose, seed }: { onClose: () => void; seed?: PublishSeed }) {
  const form = useRef<HTMLFormElement>(null);
  const { t } = useLang();
  const publisher = usePublisher();
  const [dueAt, setDueAt] = useState("");
  const [title, setTitle] = useState(seed?.title ?? "");
  const [body, setBody] = useState(seed?.body ?? "");
  const [capabilities, setCapabilities] = useState<string[]>(seed?.capabilities ?? []);
  const { agents } = useAgents();
  const [tags, setTags] = useState(seed?.tags.join(" ") ?? "");
  const [originalTags, setOriginalTags] = useState(seed?.tags);
  const [priority, setPriority] = useState<TaskPriority>(seed?.priority ?? "normal");
  const [mode, setMode] = useState<"open" | "assign" | "recruit">("open");
  const [agentId, setAgentId] = useState("");
  const [needed, setNeeded] = useState(2);
  const dispatch =
    mode === "assign"
      ? { type: mode, agentId }
      : mode === "recruit"
        ? { type: mode, needed }
        : undefined;
  const enabled = mode === "assign" ? !!agentId : mode === "recruit" ? needed >= 2 : true;
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      request("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          body,
          capabilities,
          ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
          priority,
          ...(publisher.publisherId === "human"
            ? {}
            : { publisherPersonId: publisher.publisherId }),
          ...(dispatch === undefined ? {} : { dispatch }),
          tags: originalTags ?? tags.split(/[,，\s]+/).filter(Boolean),
        }),
      }),
    onError: (error) => {
      if ("status" in error && error.status === 409)
        void client.invalidateQueries({ queryKey: ["tasks"] });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });
  const dirty = !!(
    title ||
    body ||
    tags ||
    capabilities.length ||
    dueAt ||
    priority !== "normal" ||
    mode !== "open" ||
    agentId ||
    needed !== 2
  );
  const guard = usePublishCloseGuard(form, dirty, mutation.isPending, onClose);
  return (
    <Dialog
      open
      onClose={guard.requestClose}
      title={t("common.publishTask")}
      footer={
        <>
          <Button onClick={guard.requestClose} disabled={mutation.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form="publish-task-form"
            variant="primary"
            disabled={!title.trim() || !enabled || mutation.isPending}
          >
            {t("common.publish")}
          </Button>
        </>
      }
      actions={
        <PublishTemplates
          onSelect={(template) => {
            setTitle(template.title);
            setBody(template.body ?? "");
            setPriority(template.priority ?? "normal");
            setTags((template.tags ?? []).join(" "));
            setOriginalTags(undefined);
            setCapabilities(template.capabilities ?? []);
          }}
        />
      }
    >
      <form
        ref={form}
        onFocusCapture={guard.rememberFocus}
        id="publish-task-form"
        data-ui="publish-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <Field
          label={t("common.title")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          required
        />
        <Field
          multiline
          label={t("common.body")}
          rows={6}
          placeholder="Markdown"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <CapabilityPicker
          label={t("common.capabilities")}
          value={capabilities}
          onChange={setCapabilities}
          agents={agents}
          mode="multi"
          description={t("capability.description")}
        />
        <ClaimableHint capabilities={capabilities} agents={agents} />
        <Field
          label={t("common.tags")}
          placeholder={t("common.listSeparator")}
          value={tags}
          onChange={(event) => {
            setTags(event.target.value);
            setOriginalTags(undefined);
          }}
        />
        <p className="text-secondary text-text-2">{t("capability.tagsDescription")}</p>
        <PublisherSelect publisher={publisher} />
        <PublishPriority value={priority} onChange={setPriority} />
        <Field
          type="datetime-local"
          label={t("desk.dueAtOptional")}
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
        <DispatchFields
          capabilities={capabilities}
          mode={mode}
          onModeChange={setMode}
          agentId={agentId}
          onAgentChange={setAgentId}
          needed={needed}
          onNeededChange={setNeeded}
        />
        {mutation.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {mutation.error.message}
          </p>
        )}
        <div className="pixel-legacy flex justify-end gap-2">
          <Button data-publish-close onClick={guard.requestClose} disabled={mutation.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || !enabled || mutation.isPending}
          >
            {t("common.publish")}
          </Button>
        </div>
      </form>
      {guard.confirmation}
    </Dialog>
  );
}
