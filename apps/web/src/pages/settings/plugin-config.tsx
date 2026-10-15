import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/button.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { configFields } from "./config-fields.ts";
import { ConfigInputs, useConfigInputs } from "./config-inputs.tsx";
import type { Plugin } from "./types.ts";

export function PluginConfig({ plugin, onClose }: { plugin: Plugin; onClose: () => void }) {
  const { t } = useLang();
  const client = useQueryClient();
  const fields = configFields(plugin.configSchema);
  const { values, setValues, config, ready } = useConfigInputs(fields, plugin.config);
  const save = useMutation({
    mutationFn: () =>
      request<Plugin>(`/plugins/${plugin.id}`, {
        method: "PATCH",
        body: JSON.stringify({ config }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["plugins"] });
      onClose();
    },
  });
  return (
    <form
      noValidate
      aria-label={t("settings.configure", { p1: plugin.name })}
      className="max-w-lg space-y-4 px-4 pb-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) save.mutate();
      }}
    >
      <ConfigInputs
        fields={fields}
        values={values}
        onChange={(name, value) => {
          setValues({ ...values, [name]: value });
          save.reset();
        }}
      />
      {save.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {save.error.message}
        </p>
      )}
      <Button variant="primary" type="submit" disabled={!ready || save.isPending}>
        {save.isPending ? t("settings.saving") : t("settings.save")}
      </Button>
    </form>
  );
}
