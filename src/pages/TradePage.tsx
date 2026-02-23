import { useState } from "react";
import PriceChart from "../components/ui/chart/PriceChart";
import { MarketsPanel, type Market } from "../features/markets/MarketsPanel";
import { CreateOrderPanel } from "../features/orders/CreateOrderPanel";
import { OrderBook } from "../features/orders/OrderBook";
import { WalletBalancePanel } from "../features/wallet/WalletBalancePanel";
import { useBinanceTickers } from "../hooks/useBinanceTickers";
import React from "react";
import { markets } from "../features/markets/markets.mock";
import { formatVolB } from "../lib/tokenMeta";
import {
  TimeframeOptions,
  type ItvRange,
} from "../components/ui/button/TimeframeOptions";
import { cx } from "../lib/uifunctions";

export function TradePage() {
  const [market, setMarket] = useState<Market>(markets[0]);
  const [symbol, setSymbol] = useState("WBTC");
  const [interval, setInterval] = useState<ItvRange>("1H");

  const onMarketChange = (market: Market) => {
    setMarket(market);
    if (market.symbol == "WETH") {
      setSymbol("ETH");
    } else if (market.symbol == "WBTC") {
      setSymbol("WBTC");
    } else {
      setSymbol(market.symbol);
    }
    console.log("AAAA", market, symbol, tickers);
  };

  const binanceSymbols = React.useMemo(
    () => markets.map((m) => m.binanceSymbol),
    [],
  );
  const tickers = useBinanceTickers(binanceSymbols);

  return (
    <div className="grid grid-cols-[320px_1fr_360px] gap-6">
      <MarketsPanel value={market.symbol} onSelect={onMarketChange} />

      <div className="flex flex-col gap-6">
        <div className="panel p-6 relative overflow-hidden">
          {/* subtle exchange glow */}
          <div className="pointer-events-none absolute -top-28 -right-28 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="flex items-start justify-between gap-6">
            {/* LEFT */}
            <div className="min-w-0">
              {/* pair + name */}
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-zinc-200">
                  {market.symbol}
                  <span className="text-zinc-500 font-medium">/USDT</span>
                </span>

                <span className="truncate text-xs text-zinc-400">
                  {market.name}
                </span>

                <span className="ml-1 inline-flex items-center gap-2 text-[11px] text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                  Live
                </span>
              </div>

              {/* last price */}
              <div className="mt-2 flex items-end gap-3">
                <div className="text-3xl font-semibold tracking-tight tabular-nums">
                  {Number(
                    tickers[`${symbol.toLowerCase()}usdt`]?.last ||
                      market.price,
                  ).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>

                {/* change chip */}
                {(() => {
                  const ch = Number(
                    tickers[`${symbol.toLowerCase()}usdt`]?.changePct ||
                      market.change24h,
                  );
                  const up = ch >= 0;
                  return (
                    <span
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums",
                        up
                          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                          : "border-red-400/25 bg-red-500/10 text-red-200",
                      ].join(" ")}
                      title="24h change"
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          up ? "bg-emerald-400/90" : "bg-red-400/90",
                        ].join(" ")}
                      />
                      {up ? "+" : ""}
                      {ch.toFixed(2)}%
                      <span className="text-[11px] font-medium opacity-80">
                        24h
                      </span>
                    </span>
                  );
                })()}
              </div>

              {/* small meta line */}
              <div className="mt-2 text-xs text-zinc-500">
                Last price in <span className="text-zinc-300">USDT</span>
              </div>
            </div>

            {/* RIGHT: stats card */}
            <div className="w-[220px] shrink-0">
              <div className="panel-inset p-4">
                <div className="text-xs text-zinc-400">24h Stats</div>

                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Volume</span>
                    <span className="text-zinc-200 tabular-nums">
                      {tickers[`${symbol.toLowerCase()}usdt`]
                        ? formatVolB(
                            Number(
                              tickers[`${symbol.toLowerCase()}usdt`]?.quoteVol,
                            ),
                          )
                        : market.vol}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Change</span>
                    <span
                      className={(() => {
                        const ch = Number(
                          tickers[`${symbol.toLowerCase()}usdt`]?.changePct ||
                            market.change24h,
                        );
                        return cx(
                          "tabular-nums font-semibold",
                          ch >= 0 ? "text-emerald-300" : "text-red-300",
                        );
                      })()}
                    >
                      {(() => {
                        const ch = Number(
                          tickers[`${symbol.toLowerCase()}usdt`]?.changePct ||
                            market.change24h,
                        );
                        return `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`;
                      })()}
                    </span>
                  </div>

                  {/* optional: show quote vol label */}
                  <div className="pt-2 mt-2 border-t border-white/10 text-[11px] text-zinc-500">
                    Quote volume (USDT)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <TimeframeOptions value={interval} onChange={setInterval} />

          <div className="mt-5 panel-inset h-[360px] flex items-center justify-center">
            <PriceChart
              interval={interval.toLocaleLowerCase()}
              symbol={
                symbol == "USDT"
                  ? "USDTUSD"
                  : symbol.toLocaleUpperCase() + "USDT"
              }
            />
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
