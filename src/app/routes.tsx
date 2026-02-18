import { Navigate, Route, Routes } from "react-router-dom";
import { TradePage } from "../pages/TradePage";
import { DashboardPage } from "../pages/DashboardPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/trade" replace />} />
      <Route path="/trade" element={<TradePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/trade" replace />} />
    </Routes>
  );
}
