import { Outlet } from "react-router";
import { useRealtime } from "../lib/use-realtime.ts";
import { Sidebar } from "./sidebar.tsx";

export function Shell() {
  useRealtime();

  return (
    <div data-ui="shell" className="flex h-full flex-col sidebar:flex-row">
      <Sidebar />
      <main data-ui="workspace" className="min-w-0 flex-1 overflow-auto p-6">
        <div className="pixel-workbench" aria-hidden="true" />
        <Outlet />
      </main>
    </div>
  );
}
