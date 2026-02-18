import { useState } from "react";

export function CreateOrderPanel() {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");

  return (
    <div className="panel p-6">
      <div className="text-sm font-semibold">Create Order</div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className={`btn ${side === "BUY" ? "btn-primary" : ""}`}
          onClick={() => setSide("BUY")}
        >
          Buy
        </button>
        <button
          className={`btn ${side === "SELL" ? "btn-primary" : ""}`}
          onClick={() => setSide("SELL")}
        >
          Sell
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-xs muted mb-1">Asset</div>
          <select className="select">
            <option>Wrapped Bitcoin</option>
            <option>Wrapped Ethereum</option>
          </select>
          <div className="text-xs muted mt-1">Spot: $60,000.00</div>
        </div>

        <div>
          <div className="text-xs muted mb-1">Quote Token</div>
          <select className="select">
            <option>USDT</option>
            <option>USDC</option>
          </select>
          <div className="text-xs muted mt-1">Quote Spot: $1.00</div>
        </div>

        <div>
          <div className="text-xs muted mb-1">Quantity</div>
          <input className="input" placeholder="0.00" />
          <div className="text-xs muted mt-2">
            Note: Quantity is encoded using the sell token&apos;s on-chain decimals.
          </div>
        </div>

        <div className="panel-inset p-3 text-sm">
          <div className="flex justify-between">
            <span className="muted">Estimated Total</span>
            <span>0.00 USDT</span>
          </div>
          <div className="flex justify-between mt-1 text-xs muted">
            <span>Fee (0.3%)</span>
            <span>0.0000 USDT</span>
          </div>
        </div>

        <button className="btn w-full bg-emerald-500/20 hover:bg-emerald-500/25 border-emerald-400/20 text-emerald-200">
          Create WBTC Order
        </button>
      </div>
    </div>
  );
}
