import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  bindCodeSchema,
  createPersonSchema,
  patchPersonSchema,
  personSchema,
} from "@idesk/shared/people-schemas";
import { errorSchema, idSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import { createBindCode } from "../../core/people/codes.ts";
import {
  createPerson,
  deletePerson,
  listPeople,
  patchPerson,
  unbindPerson,
} from "../../core/people/people.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireHuman } from "../middleware/auth.ts";

export function peopleRoutes(app: OpenAPIHono<AuthEnv>) {
  app.use("/api/v1/people", requireHuman);
  app.use("/api/v1/people/*", requireHuman);
  app.openapi(
    {
      method: "get",
      path: "/api/v1/people",
      responses: {
        200: {
          description: "People with bindings",
          content: { "application/json": { schema: z.array(personSchema) } },
        },
      },
    },
    (c) => c.json(listPeople(), 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/people",
      request: {
        body: { required: true, content: { "application/json": { schema: createPersonSchema } } },
      },
      responses: {
        201: { description: "Created", content: { "application/json": { schema: personSchema } } },
        409: {
          description: "Name taken",
          content: { "application/json": { schema: errorSchema } },
        },
      },
    },
    (c) => c.json(createPerson(c.req.valid("json")), 201),
  );
  app.openapi(
    {
      method: "patch",
      path: "/api/v1/people/{id}",
      request: {
        params: idSchema,
        body: { required: true, content: { "application/json": { schema: patchPersonSchema } } },
      },
      responses: {
        200: { description: "Updated", content: { "application/json": { schema: personSchema } } },
      },
    },
    (c) => c.json(patchPerson(c.req.valid("param").id, c.req.valid("json")), 200),
  );
  app.openapi(
    {
      method: "delete",
      path: "/api/v1/people/{id}",
      request: { params: idSchema },
      responses: { 204: { description: "Deleted" } },
    },
    (c) => {
      if (!deletePerson(c.req.valid("param").id)) throw new HttpError(404, "person.notFound");
      return c.body(null, 204);
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/people/{id}/bind-code",
      request: { params: idSchema },
      responses: {
        200: {
          description: "One-use binding code",
          content: { "application/json": { schema: bindCodeSchema } },
        },
      },
    },
    (c) => {
      c.header("Cache-Control", "no-store");
      return c.json(createBindCode(c.req.valid("param").id), 200);
    },
  );
  app.openapi(
    {
      method: "delete",
      path: "/api/v1/people/{id}/bindings/{bindingId}",
      request: { params: idSchema.extend({ bindingId: z.string() }) },
      responses: { 204: { description: "Unbound" } },
    },
    (c) => {
      const { id, bindingId } = c.req.valid("param");
      if (!unbindPerson(id, bindingId)) throw new HttpError(404, "person.bindingNotFound");
      return c.body(null, 204);
    },
  );
}
