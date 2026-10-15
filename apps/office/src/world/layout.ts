import { type OfficeLayout, parseOfficeLayout } from "@idesk/shared/office-layout";

export async function loadLayout(): Promise<OfficeLayout> {
  const response = await fetch("/office/layout.json", { cache: "no-store" });
  return parseOfficeLayout(await response.json());
}
