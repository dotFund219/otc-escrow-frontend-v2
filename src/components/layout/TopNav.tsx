import { NavLink } from "react-router-dom";
import { AuthWidget } from "../../features/auth/AuthWidget";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <div
          className={`
            relative px-4 py-2 rounded-xl text-sm font-medium
            transition-all duration-200 ease-out
            cursor-pointer
            ${
              isActive
                ? "text-emerald-200 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                : "text-white/60 hover:text-white hover:bg-white/10 hover:-translate-y-[1px]"
            }
          `}
        >
          {label}

          {/* Active underline indicator */}
          <span
            className={`
              absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] w-6
              rounded-full transition-all duration-300
              ${
                isActive
                  ? "bg-emerald-400 opacity-100"
                  : "bg-transparent opacity-0"
              }
            `}
          />
        </div>
      )}
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
