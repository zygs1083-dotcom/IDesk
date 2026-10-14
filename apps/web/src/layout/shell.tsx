import { Outlet } from "react-router";
import { useRealtime } from "../lib/use-realtime.ts";
import { Sidebar } from "./sidebar.tsx";

export function Shell() {
  useRealtime();

  return (
    <div className="flex h-full flex-col sidebar:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
