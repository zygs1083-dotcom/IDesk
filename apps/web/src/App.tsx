import { Navigate, Route, Routes } from "react-router";
import { useMe, useLiveEvents } from "./lib/queries.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { LoginGate } from "./components/LoginGate.tsx";
import { DispatchBoard } from "./pages/DispatchBoard.tsx";
import { AutomationBoard } from "./pages/AutomationBoard.tsx";
import { RelayPage } from "./pages/RelayPage.tsx";
import { AgentsPage } from "./pages/AgentsPage.tsx";
import { SchedulesPage } from "./pages/SchedulesPage.tsx";
import { ActivityPage } from "./pages/ActivityPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";

export function App() {
  const me = useMe();
  const authed = me.data?.kind === "owner";
  useLiveEvents(authed);

  if (me.isLoading) return <div className="h-full grid place-items-center text-ink-3">加载中…</div>;
  if (!authed) return <LoginGate onLoggedIn={() => me.refetch()} />;

  return (
    <div className="h-full flex">
      <Sidebar />
      <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
        <Routes>
          <Route path="/" element={<DispatchBoard />} />
          <Route path="/automation" element={<AutomationBoard />} />
          <Route path="/relay" element={<RelayPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
