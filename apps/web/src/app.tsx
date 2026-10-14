import { Navigate, Route, Routes } from "react-router";
import { Shell } from "./layout/shell.tsx";
import { ActivityPage } from "./pages/activity/activity-page.tsx";
import { AgentsPage } from "./pages/agents/agents-page.tsx";
import { AutomationPage } from "./pages/automation/automation-page.tsx";
import { Desk } from "./pages/desk/desk.tsx";
import { Login } from "./pages/login.tsx";
import { Placeholder } from "./pages/placeholder.tsx";
import { RelayPage } from "./pages/relay/relay-page.tsx";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/desk" replace />} />
        <Route path="/desk" element={<Desk />} />
        <Route path="/relay" element={<RelayPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/schedules" element={<Placeholder title="定时" />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<Placeholder title="设置" />} />
      </Route>
    </Routes>
  );
}
