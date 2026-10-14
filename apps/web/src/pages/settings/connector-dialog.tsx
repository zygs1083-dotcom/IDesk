import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { Switch } from "../../components/switch.tsx";
import { request } from "../../lib/api.ts";
import { configFields } from "./config-fields.ts";
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
  const client = useQueryClient();
  const [pluginId, setPluginId] = useState(connector?.pluginId ?? plugins[0]?.id ?? "");
  const [name, setName] = useState(connector?.name ?? "");
  const [values, setValues] = useState<Record<string, string | boolean>>(
    connector
      ? Object.fromEntries(
          Object.entries(connector.config).flatMap<[string, string | boolean]>(([key, value]) =>
            typeof value === "boolean"
              ? [[key, value]]
              : typeof value === "string" || typeof value === "number"
                ? [[key, String(value)]]
                : [],
          ),
        )
      : {},
  );
  const plugin = plugins.find((entry) => entry.id === pluginId);
  const fields = plugin ? configFields(plugin.configSchema) : [];
  const config = Object.fromEntries(
    fields.flatMap((field) => {
      const value = values[field.name];
      if (field.type === "boolean") return [[field.name, value === true]];
      if (value === undefined || value === "") return [];
      return [[field.name, field.type === "number" ? Number(value) : value]];
    }),
  );
  const ready =
    !!plugin &&
    !!name.trim() &&
    fields.every(
      (field) =>
        !field.required ||
        field.type === "boolean" ||
        (typeof values[field.name] === "string" && String(values[field.name]).trim() !== ""),
    );
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
    <Dialog open title={connector ? "编辑连接器" : "添加连接器"} onClose={onClose}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) create.mutate();
        }}
      >
        {connector ? (
          <p className="text-secondary text-text-2">插件 · {plugin?.name ?? connector.pluginId}</p>
        ) : plugins.length > 0 ? (
          <Segmented
            label="插件"
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
          <p className="text-secondary text-text-2">没有已启用的连接器插件</p>
        )}
        <Field
          label="名称"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {fields.map((field) =>
          field.type === "boolean" ? (
            <div key={field.name} className="flex items-center justify-between">
              <span className="text-secondary text-text-2">{field.name}</span>
              <Switch
                label={field.name}
                checked={values[field.name] === true}
                onChange={(value) => changeValue(field.name, value)}
              />
            </div>
          ) : (
            <Field
              key={field.name}
              label={field.name}
              type={field.type}
              required={field.required}
              step={field.type === "number" ? "any" : undefined}
              placeholder={field.type === "url" ? "https://" : undefined}
              value={typeof values[field.name] === "string" ? (values[field.name] as string) : ""}
              onChange={(event) => changeValue(field.name, event.target.value)}
            />
          ),
        )}
        {create.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {create.error.message}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={!ready || test.isPending || create.isPending}
            onClick={() => test.mutate()}
          >
            {test.isPending ? "测试中…" : "测试连接"}
          </Button>
          <div role="status" className="min-w-0 flex-1 text-secondary">
            {test.data?.success && (
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-status-done" />
                连接正常
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
            {create.isPending ? "保存中…" : connector ? "保存" : "添加"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
