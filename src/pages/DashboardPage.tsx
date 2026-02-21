import { WalletBalancePanel } from "../features/wallet/WalletBalancePanel";
import { OrderBook } from "../features/orders/OrderBook";
import { useSiweAuth } from "../lib/useSiweAuth";
import { useMe } from "../hooks/useMe";
import { use, useEffect } from "react";

export function DashboardPage() {
  const { token } = useSiweAuth();
  const { me } = token ? useMe(token) : { me: null };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center">
          <span className="text-emerald-300">▦</span>
        </div>
        <div className="text-2xl font-semibold">Dashboard</div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="kpi">
          <div>
            <div className="muted text-sm">Total Orders</div>
            <div className="text-4xl font-semibold mt-2">1</div>
          </div>
        </div>
        <div className="kpi">
          <div>
            <div className="muted text-sm">Active</div>
            <div className="text-4xl font-semibold mt-2 text-yellow-300">1</div>
          </div>
        </div>
        <div className="kpi">
          <div>
            <div className="muted text-sm">Completed</div>
            <div className="text-4xl font-semibold mt-2 text-emerald-300">
              0
            </div>
          </div>
        </div>
        <div className="kpi">
          <div>
            <div className="muted text-sm">KYC Tier</div>
            <div className="text-4xl font-semibold mt-2">
              {me?.kycTier || "1"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-6">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold">My Orders</div>
            <button className="btn btn-primary">+ New Order</button>
          </div>

          <div className="mt-4">
            <OrderBook compact />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <WalletBalancePanel />
          <div className="panel p-6">
            <div className="text-lg font-semibold">Profile</div>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="muted">Role</span>
                <span>{me?.role || "TRADER"}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">KYC Status</span>
                <span
                  className={`pill border-emerald-400/30 ${me?.kycTier == "2" ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"}`}
                >
                  {me?.kycTier == "2" ? "APPROVED" : "NOT APPROVED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Member Since</span>
                <span>
                  {me?.createdAt
                    ? new Date(me.createdAt).toLocaleDateString()
                    : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
