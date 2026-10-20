import type { AssistantSettings, assistantTestResultSchema } from "@idesk/shared/assistant-schemas";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { Switch } from "../../components/switch.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";

export function AssistantModelForm({ settings }: { settings: AssistantSettings }) {
  const { t } = useLang();
  const [saved, setSaved] = useState(settings);
  const [values, setValues] = useState(settings);
  const dirty = (Object.keys(values) as (keyof AssistantSettings)[]).some(
    (key) => values[key] !== saved[key],
  );
  const test = useMutation({
    mutationFn: () =>
      request<z.infer<typeof assistantTestResultSchema>>("/assistant/test", { method: "POST" }),
  });
  const save = useMutation({
    mutationFn: () =>
      request<AssistantSettings>("/assistant/settings", {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: (data) => {
      setSaved(data);
      setValues(data);
      test.reset();
    },
  });
  function change<K extends keyof AssistantSettings>(key: K, value: AssistantSettings[K]) {
    setValues({ ...values, [key]: value });
    save.reset();
    test.reset();
  }
  const busy = save.isPending || test.isPending;
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <Segmented
        formField
        label={t("assistant.protocol")}
        value={values.protocol}
        onChange={(value) => change("protocol", value)}
        options={[
          { value: "openai-chat", label: t("assistant.openai") },
          { value: "anthropic", label: "Anthropic" },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("assistant.baseUrl")}
          type="url"
          placeholder={
            values.protocol === "openai-chat"
              ? "https://api.deepseek.com"
              : "https://api.anthropic.com"
          }
          value={values.baseUrl}
          onChange={(event) => change("baseUrl", event.target.value)}
        />
        <Field
          label={t("assistant.apiKey")}
          type="password"
          autoComplete="new-password"
          value={values.apiKey}
          onChange={(event) => change("apiKey", event.target.value)}
        />
        <Field
          label={t("assistant.modelName")}
          value={values.model}
          onChange={(event) => change("model", event.target.value)}
        />
        <div data-ui="form-switch" className="flex items-center gap-3 self-end py-2">
          <span className="text-secondary text-text-2">{t("assistant.enabled")}</span>
          <Switch
            checked={values.enabled}
            label={t("assistant.enabled")}
            onChange={(enabled) => change("enabled", enabled)}
          />
        </div>
      </div>
      <p data-ui="fixed-label" className="text-secondary text-text-2">
        {t("assistant.networkHint")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={busy}>
          {t(save.isPending ? "common.saving" : "common.save")}
        </Button>
        <Button
          disabled={dirty || busy || !saved.baseUrl || !saved.apiKey || !saved.model}
          onClick={() => test.mutate()}
        >
          {t(test.isPending ? "settings.testing" : "assistant.test")}
        </Button>
        <span data-ui="fixed-label" role="status" className="min-w-0 break-words text-secondary">
          {dirty
            ? t("assistant.saveFirst")
            : test.data?.ok
              ? t("assistant.available", { seconds: (test.data.durationMs / 1000).toFixed(1) })
              : save.isSuccess && !test.error && test.data?.ok !== false
                ? t("assistant.saved")
                : ""}
          {(test.error || test.data?.ok === false) && (
            <span className="text-status-failed">{test.error?.message ?? test.data?.error}</span>
          )}
        </span>
      </div>
      {save.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {save.error.message}
        </p>
      )}
    </form>
  );
}
