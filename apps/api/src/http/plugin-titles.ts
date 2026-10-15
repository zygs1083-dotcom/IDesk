import type { Lang } from "@idesk/shared/labels";
import type { z } from "zod";

export function pluginTitles(schema: z.core.JSONSchema.JSONSchema, lang: Lang) {
  const properties = schema.properties as Record<
    string,
    { title: string; titleEn: string; [key: string]: unknown }
  >;
  return {
    ...schema,
    properties: Object.fromEntries(
      Object.entries(properties).map(([key, { titleEn, ...property }]) => [
        key,
        { ...property, title: lang === "en" ? titleEn : property.title },
      ]),
    ),
  };
}
