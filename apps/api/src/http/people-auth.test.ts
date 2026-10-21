import { afterEach, expect, test } from "vitest";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { newPerson, peopleCookie, peopleRequest } from "./people-fixture.ts";

const viewerPassword = config.IDESK_VIEWER_PASSWORD;
afterEach(() => {
  config.IDESK_VIEWER_PASSWORD = viewerPassword;
});
test("viewer reads bindings but all personnel mutations and every agent-key request return 403", async () => {
  const admin = await peopleCookie();
  const person = await newPerson(admin, "auth person");
  config.IDESK_VIEWER_PASSWORD = "viewer";
  const viewer = await peopleCookie("viewer");
  const { apiKey } = registerAgent({
    name: "people auth",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  expect((await peopleRequest("/people", viewer)).status).toBe(200);
  const routes = [
    ["/people", "POST", { name: "write", role: "member" }],
    [`/people/${person.id}`, "PATCH", { name: "write" }],
    [`/people/${person.id}`, "DELETE", undefined],
    [`/people/${person.id}/bind-code`, "POST", undefined],
    [`/people/${person.id}/bindings/missing`, "DELETE", undefined],
  ] as const;
  for (const credential of [viewer, apiKey]) {
    for (const [path, method, body] of routes)
      expect((await peopleRequest(path, credential, method, body)).status).toBe(403);
  }
  expect((await peopleRequest("/people", apiKey)).status).toBe(403);
  expect((await peopleRequest("/people", "")).status).toBe(401);
});
