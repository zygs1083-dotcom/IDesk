import { readConfig } from "./config.js";

export async function api<T>(method: string, path: string, body?: object): Promise<T> {
  const { url, key } = await readConfig();
  const response = await fetch(`${url}/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const { error } = (await response.json()) as { error: string };
    throw new Error(error);
  }
  return response.json() as Promise<T>;
}
