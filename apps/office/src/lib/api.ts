import { currentLang } from "../i18n/lang.tsx";
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept-Language", currentLang());
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (response.status === 401) location.href = "/login?from=/office/";
  if (!response.ok) {
    const { error }: { error: string } = await response.json();
    throw Object.assign(new Error(error), { status: response.status });
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
