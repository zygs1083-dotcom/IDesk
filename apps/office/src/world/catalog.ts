import { type Catalog, catalogSchema } from "@idesk/shared/office-schemas";

export async function loadCatalog(): Promise<Catalog> {
  const response = await fetch("/office/catalog.json", { cache: "no-store" });
  return catalogSchema.parse(await response.json());
}
