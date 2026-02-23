import { WalletBalancePanel } from "../features/wallet/WalletBalancePanel";
import { OrderBook } from "../features/orders/OrderBook";
import { useSiweAuth } from "../features/auth/useSiweAuth";
import { useMe } from "../hooks/useMe";
import { useEffect, useState } from "react";
import { fetchOrderSumary } from "../lib/api/orders";
import { ProfilePanel } from "../features/profile/ProfilePanel";

type OrderSummary = {
  total: number;
  active: number;
  completed: number;
};

export function DashboardPage() {
  const { token } = useSiweAuth();
  const { me, error } = useMe(token ? token : undefined);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (token) {
      console.log("AAAAAAAAAAAA");
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

      <div className="grid grid-cols-4 gap-6">
        <div className="kpi">
          <div>
            <div className="muted text-sm">Total Orders</div>
            <div className="text-4xl font-semibold mt-2">
              {orderSummary?.total || 0}
            </div>
          </div>
        </div>
        <div className="kpi">
          <div>
            <div className="muted text-sm">Active</div>
            <div className="text-4xl font-semibold mt-2 text-yellow-300">
              {orderSummary?.active || 0}
            </div>
          </div>
        </div>
        <div className="kpi">
          <div>
            <div className="muted text-sm">Completed</div>
            <div className="text-4xl font-semibold mt-2 text-emerald-300">
              {orderSummary?.completed || 0}
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
          <ProfilePanel me={error ? undefined : me!} />
        </div>
      </div>
    </div>
  );
}
