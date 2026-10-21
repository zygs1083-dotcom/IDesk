import { personSchema } from "@idesk/shared/people-schemas";
import { expect } from "vitest";
import { app } from "./app.ts";

export async function peopleCookie(password = "test"): Promise<string> {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  expect(response.status).toBe(200);
  return (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
}
export function peopleRequest(path: string, credential: string, method = "GET", body?: object) {
  return app.request(`/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
export async function newPerson(cookie: string, name = "张三", role = "member") {
  const response = await peopleRequest("/people", cookie, "POST", { name, role });
  expect(response.status).toBe(201);
  return personSchema.parse(await response.json());
}
