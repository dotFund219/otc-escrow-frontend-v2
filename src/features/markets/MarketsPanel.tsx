import React from "react";
import { markets } from "./markets.mock";

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

  const handleSelect = (m: Market) => {
    if (!isControlled) setInternal(m.symbol);
    onSelect?.(m);
  };

  // 🔎 검색 필터
  const filtered = React.useMemo(() => {
    if (!query.trim()) return markets;
    const q = query.toLowerCase();
    return markets.filter(
      (m) =>
        m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    );
  }, [query]);

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
                    ${m.price.toLocaleString()}
                  </div>
                  <div
                    className={`text-xs ${
                      m.change24h >= 0 ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {m.change24h >= 0 ? "+" : ""}
                    {m.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="mt-2 text-xs muted">Vol {m.vol}</div>
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
