import clsx from "clsx";
import { sampleOrders } from "./orders.mock";

export function OrderBook({ compact }: { compact?: boolean }) {
  return (
    <div className={clsx("panel p-6", compact && "p-0 bg-transparent shadow-none")}>
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Order Book</div>
          <div className="text-xs muted">Auto-refreshes every 10s</div>
        </div>
      )}

      <div className={clsx("mt-4", compact && "mt-0")}>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-6 bg-white/5 text-xs muted px-4 py-2">
            <div>TYPE</div>
            <div>PAIR</div>
            <div>QUANTITY</div>
            <div>PRICE</div>
            <div>TOTAL</div>
            <div className="text-right">ACTION</div>
          </div>

          {sampleOrders.map((o) => (
            <div key={o.id} className="grid grid-cols-6 px-4 py-3 text-sm border-t border-white/10">
              <div>
                <span className={clsx("pill px-2 py-0.5", o.side === "SELL" ? "bg-red-500/15 border-red-400/20 text-red-200" : "bg-emerald-500/15 border-emerald-400/20 text-emerald-200")}>
                  {o.side}
                </span>
              </div>
              <div className="font-semibold">{o.pair}</div>
              <div>{o.quantity.toFixed(4)}</div>
              <div>{o.price.toLocaleString()} USDT</div>
              <div>{o.total.toFixed(2)} USDT</div>
              <div className="text-right">
                <button className="btn btn-danger py-1 px-3 text-xs">Cancel</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
