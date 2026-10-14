import { Outlet } from "react-router";
import { Sidebar } from "./sidebar.tsx";

export function Shell() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
