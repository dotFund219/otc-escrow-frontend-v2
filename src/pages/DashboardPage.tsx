import { WalletBalancePanel } from "../features/wallet/WalletBalancePanel";
import { OrderBook } from "../features/orders/OrderBook";
import { useSiweAuth } from "../features/auth/useSiweAuth";
import { useMe } from "../hooks/useMe";
import { useEffect, useState } from "react";
import { fetchOrderSumary } from "../lib/api/orders";
import { ProfilePanel } from "../features/profile/ProfilePanel";
import { useNavigate } from "react-router-dom";

type OrderSummary = {
  total: number;
  active: number;
  completed: number;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { token } = useSiweAuth();
  const { me, error } = useMe(token ? token : undefined);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (token) {
      Promise.resolve()
        .then(async () => {
          const sumary = await fetchOrderSumary(token);

          const orderSummary: OrderSummary = {
            total: sumary.summary.total,
            active:
              sumary.summary.delivered +
              sumary.summary.open +
              sumary.summary.taken,
            completed: sumary.summary.finished,
          };

          setOrderSummary(orderSummary);
        })
        .finally(() => {});
    }
  }, [token]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center">
          <span className="text-emerald-300">▦</span>
        </div>
        <div className="text-2xl font-semibold">Dashboard</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* TOTAL */}
        <div className="relative panel p-5 overflow-hidden group hover:bg-white/[0.06] transition">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">
                Total Orders
              </div>
              <div className="text-3xl xl:text-4xl font-semibold mt-3 tabular-nums">
                {orderSummary?.total || 0}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="pill text-[10px] bg-white/5">All time</span>
              <span className="text-xs text-white/40 mt-2">📊</span>
            </div>
          </div>
        </div>

        {/* ACTIVE */}
        <div className="relative panel p-5 overflow-hidden group hover:bg-white/[0.06] transition">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent pointer-events-none" />

          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">
                Active
              </div>
              <div className="text-3xl xl:text-4xl font-semibold mt-3 text-yellow-300 tabular-nums">
                {orderSummary?.active || 0}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="pill text-[10px] bg-yellow-500/10 border-yellow-400/20 text-yellow-300">
                In Progress
              </span>
              <span className="w-2 h-2 rounded-full bg-yellow-400 mt-3 animate-pulse" />
            </div>
          </div>
        </div>

        {/* COMPLETED */}
        <div className="relative panel p-5 overflow-hidden group hover:bg-white/[0.06] transition">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />

          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">
                Completed
              </div>
              <div className="text-3xl xl:text-4xl font-semibold mt-3 text-emerald-300 tabular-nums">
                {orderSummary?.completed || 0}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="pill text-[10px] bg-emerald-500/10 border-emerald-400/20 text-emerald-300">
                Settled
              </span>
              <span className="text-xs text-emerald-400 mt-2">✓</span>
            </div>
          </div>
        </div>

        {/* KYC */}
        <div className="relative panel p-5 overflow-hidden group hover:bg-white/[0.06] transition">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent pointer-events-none" />

          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40">
                KYC Tier
              </div>
              <div className="text-3xl xl:text-4xl font-semibold mt-3 tabular-nums">
                {me?.kycTier || "1"}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="pill text-[10px] bg-violet-500/10 border-violet-400/20 text-violet-300">
                {me?.kycTier == "1"
                  ? "Basic"
                  : me?.kycTier == "2"
                    ? "Verified"
                    : "Unknown"}
              </span>
              <span className="text-xs text-violet-400 mt-2">🛡</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* LEFT: My Orders / Exchange Area */}
        <div className="panel p-0 overflow-hidden">
          {/* Top Exchange Header */}
          <div
            className="
        px-6 py-5
        border-b border-white/10
        bg-gradient-to-b from-white/[0.06] to-white/[0.02]
      "
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-xl font-semibold">My Orders</div>
                  <span
                    className="
                inline-flex items-center gap-2
                rounded-full px-3 py-1 text-[11px] font-semibold
                bg-black/30 border border-white/10 text-white/70
              "
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                    Live
                  </span>
                </div>

                <div className="mt-1 text-xs text-white/50">
                  Private order view • Sign-in required • Auto-refresh enabled
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="btn btn-primary px-4 py-2 text-xs"
                  onClick={() => navigate("/trade")}
                >
                  + New Order
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6">
            {/* OrderBook already looks good; compact mode keeps it tight */}
            <OrderBook compact />
          </div>
        </div>

        {/* RIGHT: Sidebar Panels */}
        <div className="flex flex-col gap-6 xl:sticky xl:top-6 h-fit">
          <div className="panel p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03]">
              <div className="text-sm font-semibold">Wallet</div>
              <div className="text-xs text-white/50 mt-1">
                Balance & available funds
              </div>
            </div>
            <div className="p-5">
              <WalletBalancePanel />
            </div>
          </div>

          <div className="panel p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03]">
              <div className="text-sm font-semibold">Profile</div>
              <div className="text-xs text-white/50 mt-1">
                Account info & settings
              </div>
            </div>
            <div className="p-5">
              <ProfilePanel me={error ? undefined : me!} />
            </div>
          </div>

          {/* Optional: small “Market Status” card for exchange feel */}
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Market Status</div>
                <div className="text-xs text-white/50 mt-1">
                  Chain: {Number(import.meta.env.VITE_CHAIN_ID || 1)}
                </div>
              </div>
              <span className="pill text-xs bg-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 inline-block mr-2" />
                Online
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="panel-inset p-3">
                <div className="text-[11px] text-white/50">Latency</div>
                <div className="mt-1 text-sm font-semibold tabular-nums">
                  ~120ms
                </div>
              </div>
              <div className="panel-inset p-3">
                <div className="text-[11px] text-white/50">Refresh</div>
                <div className="mt-1 text-sm font-semibold tabular-nums">
                  5s
                </div>
              </div>
              <div className="panel-inset p-3">
                <div className="text-[11px] text-white/50">Mode</div>
                <div className="mt-1 text-sm font-semibold">Private</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
