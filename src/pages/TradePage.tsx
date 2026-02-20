import PriceChart from "../components/ui/chart/PriceChart";
import { MarketsPanel } from "../features/markets/MarketsPanel";
import { CreateOrderPanel } from "../features/orders/CreateOrderPanel";
import { OrderBook } from "../features/orders/OrderBook";
import { WalletBalancePanel } from "../features/wallet/WalletBalancePanel";

export function TradePage() {
  return (
    <div className="grid grid-cols-[320px_1fr_360px] gap-6">
      <MarketsPanel />

      <div className="flex flex-col gap-6">
        <div className="panel p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm muted">
                WETH/USDT{" "}
                <span className="ml-2 text-xs muted">Wrapped Ethereum</span>
              </div>
              <div className="text-3xl font-semibold mt-1">$3,000.00</div>
              <div className="text-sm text-emerald-300 mt-1">+0.00% 24h</div>
            </div>
            <div className="text-right text-sm muted">
              <div>24h Volume</div>
              <div className="text-zinc-200">0.00B</div>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <div className="flex items-center gap-3 text-sm muted">
            <button className="pill">1H</button>
            <button className="pill">4H</button>
            <button className="pill border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
              1D
            </button>
            <button className="pill">1W</button>
            <button className="pill">1M</button>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Real-time</span>
            </div>
          </div>

          <div className="mt-5 panel-inset h-[360px] flex items-center justify-center">
            <PriceChart />
            {/* <div className="text-center">
              <div className="text-zinc-400">Price Chart</div>
              <div className="text-xs muted mt-1">WETH/USDT · 1D</div>
            </div> */}
          </div>
        </div>

        <OrderBook />
      </div>

      <div className="flex flex-col gap-6">
        <CreateOrderPanel />
        <WalletBalancePanel />
      </div>
    </div>
  );
}
