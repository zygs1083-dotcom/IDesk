import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { automationFilterParams } from "./automation-filter-params.ts";

export function useAutomationFilters<T extends { id: string }>(
  connectors: T[],
  status: "pending" | "error" | "success",
) {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const search = params.get("q") ?? "";
  const [q, setQ] = useState(search);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { connector, range } = automationFilterParams(params, connectors, status);
  useEffect(() => {
    timer.current = setTimeout(() => setQ(search), 200);
    return () => clearTimeout(timer.current);
  }, [search]);
  useEffect(() => {
    if (
      status === "success" &&
      ((connector && params.get("connector") !== connector.id) || params.get("q") === "")
    ) {
      setParams((current) => automationFilterParams(current, connectors, status).normalized, {
        replace: true,
      });
    }
  }, [status, connector, connectors, params, setParams]);
  const setFilter = (key: "q" | "connector" | "range", value: string) => {
    setParams(
      (current) => {
        const { normalized } = automationFilterParams(current, connectors, status);
        if (value === "") normalized.delete(key);
        else normalized.set(key, value);
        return normalized;
      },
      { replace: key === "q" },
    );
  };
  const clearSearch = () => {
    clearTimeout(timer.current);
    setQ("");
    const next = new URLSearchParams(params);
    next.delete("q");
    navigate({ search: next.toString(), hash });
  };
  return { search, q, connector, range, setFilter, clearSearch };
}
