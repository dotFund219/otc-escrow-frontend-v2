import { Navigate, Route, Routes } from "react-router-dom";
import { TradePage } from "../pages/TradePage";
import { DashboardPage } from "../pages/DashboardPage";
import AdminPage from "../pages/AdminPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/trade" replace />} />
      <Route path="/trade" element={<TradePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/trade" replace />} />
    </Routes>
  );
}
