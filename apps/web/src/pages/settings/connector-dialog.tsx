import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { configFields } from "./config-fields.ts";
import { ConfigInputs, useConfigInputs } from "./config-inputs.tsx";
import type { ConnectionResult, Connector, Plugin } from "./types.ts";

export function ConnectorDialog({
  plugins,
  connector,
  onClose,
}: {
  plugins: Plugin[];
  connector?: Connector;
  onClose: () => void;
}) {
  const { t } = useLang();
  const client = useQueryClient();
  const [pluginId, setPluginId] = useState(connector?.pluginId ?? plugins[0]?.id ?? "");
  const [name, setName] = useState(connector?.name ?? "");
  const plugin = plugins.find((entry) => entry.id === pluginId);
  const fields = plugin ? configFields(plugin.configSchema) : [];
  const {
    values,
    setValues,
    config,
    ready: configReady,
  } = useConfigInputs(fields, connector?.config);
  const ready = !!plugin && !!name.trim() && configReady;
  const test = useMutation({
    mutationFn: () =>
      request<ConnectionResult>("/connectors/test", {
        method: "POST",
        body: JSON.stringify({ id: connector?.id, pluginId, config }),
      }),
  });
  const create = useMutation({
    mutationFn: () =>
      request<Connector>(connector ? `/connectors/${connector.id}` : "/connectors", {
        method: connector ? "PATCH" : "POST",
        body: JSON.stringify({ pluginId, name: name.trim(), config }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["automation"] });
      onClose();
    },
  });
  function changeValue(key: string, value: string | boolean) {
    setValues({ ...values, [key]: value });
    test.reset();
    create.reset();
  }
  return (
    <Dialog
      open
      title={connector ? t("settings.editConnector") : t("settings.addConnector")}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="ghost"
            disabled={!ready || test.isPending || create.isPending}
            onClick={() => test.mutate()}
          >
            {test.isPending ? t("settings.testing") : t("settings.testConnection")}
          </Button>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            form="connector-form"
            variant="primary"
            disabled={!ready || create.isPending || test.isPending}
          >
            {create.isPending ? t("common.saving") : connector ? t("common.save") : t("common.add")}
          </Button>
        </>
      }
    >
      <form
        id="connector-form"
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) create.mutate();
        }}
      >
        {connector ? (
          <p className="text-secondary text-text-2">
            {t("settings.pluginLabel", { name: plugin?.name ?? connector.pluginId })}
          </p>
        ) : plugins.length > 0 ? (
          <Segmented
            formField
            label={t("common.plugins")}
            value={pluginId}
            options={plugins.map((entry) => ({ value: entry.id, label: entry.name }))}
            onChange={(id) => {
              setPluginId(id);
              setValues({});
              test.reset();
              create.reset();
            }}
          />
        ) : (
          <p className="text-secondary text-text-2">{t("settings.noConnectorPlugins")}</p>
        )}
        <Field
          label={t("common.name")}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <ConfigInputs fields={fields} values={values} onChange={changeValue} />
        {create.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {create.error.message}
          </p>
        )}
        <div className="pixel-legacy flex flex-wrap items-center gap-2">
          <Button
            disabled={!ready || test.isPending || create.isPending}
            onClick={() => test.mutate()}
          >
            {test.isPending ? t("settings.testing") : t("settings.testConnection")}
          </Button>
          <div role="status" className="min-w-0 flex-1 text-secondary">
            {test.data?.success && (
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-status-done" />
                {t("settings.connectionOk")}
              </span>
            )}
            {(test.error || test.data?.success === false) && (
              <span className="text-status-failed">{test.error?.message ?? test.data?.error}</span>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!ready || create.isPending || test.isPending}
          >
            {create.isPending ? t("common.saving") : connector ? t("common.save") : t("common.add")}
          </Button>
        </div>
        <div role="status" className="pixel-only text-secondary">
          {test.data?.success && (
            <span className="text-status-done">{t("settings.connectionOk")}</span>
          )}
          {(test.error || test.data?.success === false) && (
            <span className="text-status-failed">{test.error?.message ?? test.data?.error}</span>
          )}
        </div>
      </form>
    </Dialog>
  );
}
