import { markets } from "./markets.mock";

export function MarketsPanel() {
  return (
    <div className="panel p-5">
      <div className="text-sm font-semibold">Markets</div>

      <div className="mt-3">
        <input className="input" placeholder="Search markets..." />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {markets.map((m) => (
          <button key={m.symbol} className="panel-inset p-3 text-left hover:bg-white/5 transition">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{m.symbol}</div>
                <div className="text-xs muted">{m.name}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">${m.price.toLocaleString()}</div>
                <div className="text-xs text-emerald-300">+{m.change24h.toFixed(2)}%</div>
              </div>
            </div>
            <div className="mt-2 text-xs muted">Vol {m.vol}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
