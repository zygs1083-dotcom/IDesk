import { Navigate, Route, Routes } from "react-router";
import { Shell } from "./layout/shell.tsx";
import { Placeholder } from "./pages/placeholder.tsx";

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/desk" replace />} />
        <Route path="/desk" element={<Placeholder title="协作台" />} />
        <Route path="/automation" element={<Placeholder title="自动化" />} />
        <Route path="/agents" element={<Placeholder title="智能体" />} />
        <Route path="/schedules" element={<Placeholder title="定时" />} />
        <Route path="/activity" element={<Placeholder title="活动" />} />
        <Route path="/settings" element={<Placeholder title="设置" />} />
      </Route>
    </Routes>
  );
}
