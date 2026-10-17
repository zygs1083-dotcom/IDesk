import type { Plugin } from "./types.ts";

export type ConfigField = {
  name: string;
  label: string;
  type: "text" | "url" | "password" | "number" | "boolean";
  required: boolean;
  options?: string[];
  default?: string | boolean;
};

export function configFields(schema: Plugin["configSchema"]): ConfigField[] {
  const properties = schema.properties as
    | Record<
        string,
        {
          type?: string;
          format?: string;
          title?: string;
          enum?: string[];
          default?: string | number | boolean;
        }
      >
    | undefined;
  const required = schema.required as string[] | undefined;
  if (!properties) return [];
  return Object.entries(properties).flatMap(([name, property]) => {
    let type: ConfigField["type"];
    if (property.type === "string") {
      type = /token|key|secret|password|webhookUrl/i.test(name)
        ? "password"
        : property.format === "uri"
          ? "url"
          : "text";
    } else if (property.type === "number" || property.type === "integer") {
      type = "number";
    } else if (property.type === "boolean") {
      type = "boolean";
    } else return [];
    return [
      {
        name,
        label: property.title ?? name,
        type,
        required: required?.includes(name) ?? false,
        ...(property.default !== undefined
          ? {
              default:
                typeof property.default === "number" ? String(property.default) : property.default,
            }
          : {}),
        ...(property.type === "string" && property.enum ? { options: property.enum } : {}),
      },
    ];
  });
}
