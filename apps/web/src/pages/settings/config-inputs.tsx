import { useId, useState } from "react";
import { Field } from "../../components/field.tsx";
import { Switch } from "../../components/switch.tsx";
import { useLang } from "../../i18n/lang.tsx";
import type { ConfigField } from "./config-fields.ts";

type Values = Record<string, string | boolean>;

export function useConfigInputs(fields: ConfigField[], initial: Record<string, unknown> = {}) {
  const [inputs, setValues] = useState<Values>(() =>
    Object.fromEntries(
      Object.entries(initial).flatMap<[string, string | boolean]>(([key, value]) =>
        typeof value === "boolean"
          ? [[key, value]]
          : typeof value === "string" || typeof value === "number"
            ? [[key, String(value)]]
            : [],
      ),
    ),
  );
  const values: Values = {
    ...Object.fromEntries(
      fields.flatMap((field) => (field.default === undefined ? [] : [[field.name, field.default]])),
    ),
    ...inputs,
  };
  const config = Object.fromEntries(
    fields.flatMap((field) => {
      const value = values[field.name];
      if (field.type === "boolean") return [[field.name, value === true]];
      if (value === undefined || value === "") return [];
      return [[field.name, field.type === "number" ? Number(value) : value]];
    }),
  );
  const ready = fields.every(
    (field) =>
      !field.required ||
      field.type === "boolean" ||
      (typeof values[field.name] === "string" && String(values[field.name]).trim() !== ""),
  );
  return { values, setValues, config, ready };
}

export function ConfigInputs({
  fields,
  values,
  onChange,
}: {
  fields: ConfigField[];
  values: Values;
  onChange: (name: string, value: string | boolean) => void;
}) {
  const { t } = useLang();
  const id = useId();
  return fields.map((field) =>
    field.options ? (
      <div key={field.name} className="space-y-2">
        <label htmlFor={`${id}-${field.name}`} className="block text-secondary text-text-2">
          {field.label}
        </label>
        <select
          id={`${id}-${field.name}`}
          required={field.required}
          className="w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body outline-none focus:border-accent"
          value={typeof values[field.name] === "string" ? (values[field.name] as string) : ""}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          {field.default === undefined && <option value="">{t("settings.selectAnOption")}</option>}
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    ) : field.type === "boolean" ? (
      <div key={field.name} className="flex items-center justify-between">
        <span className="text-secondary text-text-2">{field.label}</span>
        <Switch
          label={field.label}
          checked={values[field.name] === true}
          onChange={(value) => onChange(field.name, value)}
        />
      </div>
    ) : (
      <Field
        key={field.name}
        label={field.label}
        type={field.type}
        required={field.required}
        step={field.type === "number" ? "any" : undefined}
        placeholder={field.type === "url" ? "https://" : undefined}
        value={typeof values[field.name] === "string" ? (values[field.name] as string) : ""}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    ),
  );
}
