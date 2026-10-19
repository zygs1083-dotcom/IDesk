import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { Shell } from "./layout/shell.tsx";
import { ActivityPage } from "./pages/activity/activity-page.tsx";
import { AgentsPage } from "./pages/agents/agents-page.tsx";
import { AutomationPage } from "./pages/automation/automation-page.tsx";
import { Desk } from "./pages/desk/desk.tsx";
import { TaskHistory } from "./pages/desk/history.tsx";
import { Login } from "./pages/login.tsx";
import { RelayPage } from "./pages/relay/relay-page.tsx";
import { SchedulesPage } from "./pages/schedules/schedules-page.tsx";
import { ServersPage } from "./pages/servers/servers-page.tsx";
import { AccessPage } from "./pages/settings/access-page.tsx";
import { AppearancePage } from "./pages/settings/appearance-page.tsx";
import { ConnectorsPage } from "./pages/settings/connectors-page.tsx";
import { PluginsPage } from "./pages/settings/plugins-page.tsx";
import { SettingsPage } from "./pages/settings/settings-page.tsx";

const PixelKit = import.meta.env.DEV
  ? lazy(() => import("./pages/dev/pixel-kit.tsx").then((module) => ({ default: module.PixelKit })))
  : null;

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {PixelKit && (
        <Route
          path="/dev/pixel-kit"
          element={
            <Suspense fallback={null}>
              <PixelKit />
            </Suspense>
          }
        />
      )}
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/desk" replace />} />
        <Route path="/desk" element={<Desk />} />
        <Route path="/desk/history" element={<TaskHistory />} />
        <Route path="/relay" element={<RelayPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/servers" element={<ServersPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />}>
          <Route index element={<Navigate to="/settings/connectors" replace />} />
          <Route path="connectors" element={<ConnectorsPage />} />
          <Route path="plugins" element={<PluginsPage />} />
          <Route path="access" element={<AccessPage />} />
          <Route path="appearance" element={<AppearancePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
