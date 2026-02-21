import React from "react";
import { markets } from "./markets.mock";
import { useBinanceTickers } from "../../hooks/useBinanceTickers";
import { formatVolB } from "../../lib/tokenMeta";

export type Market = (typeof markets)[number];

type MarketsPanelProps = {
  value?: string;
  defaultValue?: string;
  onSelect?: (market: Market) => void;
};

export function MarketsPanel({
  value,
  defaultValue,
  onSelect,
}: MarketsPanelProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<string | undefined>(
    defaultValue,
  );
  const [query, setQuery] = React.useState("");

  const selectedSymbol = isControlled ? value : internal;

  const binanceSymbols = React.useMemo(
    () => markets.map((m) => m.binanceSymbol),
    [],
  );
  const tickers = useBinanceTickers(binanceSymbols);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter(
      (m) =>
        m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = (m: Market) => {
    if (!isControlled) setInternal(m.symbol);
    onSelect?.(m);
  };

  return (
    <div className="panel p-5">
      <div className="text-sm font-semibold">Markets</div>

      <div className="mt-3">
        <input
          className="input"
          placeholder="Search markets..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.map((m) => {
          const selected = m.symbol === selectedSymbol;

          const t = tickers[m.binanceSymbol];
          const price = t?.last ?? m.price;
          const change24h = t?.changePct ?? m.change24h;
          const volText = t ? formatVolB(t.quoteVol) : m.vol;

          return (
            <button
              key={m.symbol}
              type="button"
              onClick={() => handleSelect(m)}
              aria-pressed={selected}
              className={[
                "panel-inset p-3 text-left transition-all duration-150",
                "hover:!bg-white/10 hover:!border-white/20",
                selected ? "ring-1 ring-emerald-400/50 bg-white/10" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{m.symbol}</div>
                  <div className="text-xs muted">{m.name}</div>
                </div>

                <div className="text-right">
                  <div className="font-semibold">
                    $
                    {Number(price).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}
                  </div>

                  <div
                    className={`text-xs ${change24h >= 0 ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {change24h >= 0 ? "+" : ""}
                    {Number(change24h).toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs muted">Vol {volText}</div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-xs muted text-center py-6">No markets found</div>
        )}
      </div>
    </div>
  );
}
