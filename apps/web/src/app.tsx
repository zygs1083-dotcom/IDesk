import { Navigate, Route, Routes } from "react-router";
import { Shell } from "./layout/shell.tsx";
import { Desk } from "./pages/desk/desk.tsx";
import { Login } from "./pages/login.tsx";
import { Placeholder } from "./pages/placeholder.tsx";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/desk" replace />} />
        <Route path="/desk" element={<Desk />} />
        <Route path="/relay" element={<Placeholder title="传递区" />} />
        <Route path="/automation" element={<Placeholder title="自动化" />} />
        <Route path="/agents" element={<Placeholder title="智能体" />} />
        <Route path="/schedules" element={<Placeholder title="定时" />} />
        <Route path="/activity" element={<Placeholder title="活动" />} />
        <Route path="/settings" element={<Placeholder title="设置" />} />
      </Route>
    </Routes>
  );
}
