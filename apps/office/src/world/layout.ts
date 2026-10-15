import { type Catalog, type Layout, parseLayout } from "@idesk/shared/office-schemas";

export async function loadLayout(catalog: Catalog): Promise<Layout> {
  const response = await fetch("/office/layout.json", { cache: "no-store" });
  return parseLayout(await response.json(), catalog);
}
