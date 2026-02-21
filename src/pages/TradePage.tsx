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
      <MarketsPanel onSelect={onMarketChange} />

      <div className="flex flex-col gap-6">
        <div className="panel p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm muted">
                {market.symbol}/USDT{" "}
                <span className="ml-2 text-xs muted">{market.name}</span>
              </div>
              <div className="text-3xl font-semibold mt-1">
                {Number(
                  tickers[`${symbol.toLowerCase()}usdt`]?.last || market.price,
                ).toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}
              </div>
              <div
                className={`text-sm ${Number(tickers[`${symbol.toLowerCase()}usdt`]?.changePct || market.change24h) >= 0 ? "text-emerald-300" : "text-red-300"}`}
              >
                {Number(
                  tickers[`${symbol.toLowerCase()}usdt`]?.changePct ||
                    market.change24h,
                ).toFixed(2)}
                % 24h
              </div>
            </div>
            <div className="text-right text-sm muted">
              <div>24h Volume</div>
              <div className={"text-zinc-200"}>
                {tickers[`${symbol.toLowerCase()}usdt`]
                  ? formatVolB(
                      Number(tickers[`${symbol.toLowerCase()}usdt`]?.quoteVol),
                    )
                  : market.vol}
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
