import { expect, test } from "vitest";
import { automationFilterParams } from "./automation-filter-params.ts";

const connectors = [{ id: "first" }, { id: "second" }];

test.each(["", "range=today", "range=invalid", "range="])(
  "%s starts with today without reading a stored range",
  (query) => {
    expect(automationFilterParams(new URLSearchParams(query), connectors, "success").range).toBe(
      "today",
    );
  },
);

test("a valid shared connector and all range take precedence and survive refresh", () => {
  const params = new URLSearchParams("connector=second&range=all&q=workflow&extra=a&extra=b");
  const filters = automationFilterParams(params, connectors, "success");
  expect(filters.connector).toBe(connectors[1]);
  expect(filters.range).toBe("all");
  expect(filters.search).toBe("workflow");
  expect(filters.normalized.toString()).toBe(params.toString());
  expect(automationFilterParams(filters.normalized, connectors, "success").connector).toBe(
    connectors[1],
  );
});

test.each(["", "connector=deleted", "connector="])(
  "%s resolves to the first connector once the list succeeds",
  (query) => {
    const params = new URLSearchParams(`${query}&extra=keep`);
    const filters = automationFilterParams(params, connectors, "success");
    expect(filters.connector).toBe(connectors[0]);
    expect(filters.normalized.get("connector")).toBe("first");
    expect(filters.normalized.get("extra")).toBe("keep");
  },
);

test.each(["pending", "error"] as const)(
  "%s never supplements the connector even with cached list data",
  (status) => {
    for (const query of ["q=new", "connector=deleted&range=all"]) {
      const params = new URLSearchParams(query);
      for (const available of [[], connectors]) {
        const filters = automationFilterParams(params, available, status);
        expect(filters.normalized.toString()).toBe(params.toString());
      }
    }
  },
);

test.each(["pending", "error", "success"] as const)(
  "an empty %s list has no connector for runs or jobs",
  (status) => {
    const filters = automationFilterParams(new URLSearchParams("connector=deleted"), [], status);
    expect(filters.connector).toBeUndefined();
    expect(filters.normalized.get("connector")).toBe("deleted");
  },
);

test("empty search and invalid range normalize without changing unknown parameters", () => {
  const filters = automationFilterParams(
    new URLSearchParams("connector=first&q=&range=invalid&extra=%2Fpath&showHidden=true"),
    connectors,
    "success",
  );
  expect(filters.normalized.has("q")).toBe(false);
  expect(filters.normalized.get("range")).toBe("today");
  expect(filters.normalized.get("extra")).toBe("/path");
  expect(filters.normalized.get("showHidden")).toBe("true");
});

test("repeated parameters use first values with normal URLSearchParams semantics", () => {
  const filters = automationFilterParams(
    new URLSearchParams("connector=second&connector=first&range=all&range=today&q=+&q=last"),
    connectors,
    "success",
  );
  expect(filters.connector).toBe(connectors[1]);
  expect(filters.range).toBe("all");
  expect(filters.search).toBe(" ");
});
