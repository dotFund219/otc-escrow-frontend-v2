import { AppRoutes } from "./routes";
import { Shell } from "../components/layout/Shell";

export function App() {
  return (
    <Shell>
      <AppRoutes />
    </Shell>
  );
}
