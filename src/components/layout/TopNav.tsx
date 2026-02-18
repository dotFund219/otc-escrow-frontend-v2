import { NavLink } from "react-router-dom";
import { AuthWidget } from "../../features/auth/AuthWidget";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `pill ${isActive ? "border-emerald-400/40 bg-emerald-500/10" : ""}`
      }
    >
      {label}
    </NavLink>
  );
}

export function TopNav() {
  return (
    <div className="sticky top-0 z-30 backdrop-blur bg-black/30 border-b border-white/10">
      <div className="px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center">
            <span className="text-emerald-300 font-bold">↗</span>
          </div>
          <div className="font-semibold">OTC Desk</div>

          <div className="ml-6 flex items-center gap-2">
            <NavItem to="/trade" label="Trade" />
            <NavItem to="/dashboard" label="Dashboard" />
          </div>
        </div>

        <AuthWidget />
      </div>
    </div>
  );
}
