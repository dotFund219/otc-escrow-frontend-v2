import * as React from "react";

export type BinanceTicker = {
  last: number; // c
  changePct: number; // P
  quoteVol: number; // q
};

type TickerMap = Record<string, BinanceTicker>; // key: lowercased symbol

export function useBinanceTickers(symbols: string[]) {
  const [tickers, setTickers] = React.useState<TickerMap>({});

  const streamsKey = React.useMemo(() => {
    const list = symbols
      .map((s) => (s ?? "").trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(list)).join("/");
  }, [symbols]);

  React.useEffect(() => {
    if (!streamsKey) return;

    let ws: WebSocket | null = null;
    let alive = true;
    let retry = 0;
    let timer: number | null = null;

    const connect = () => {
      // Combined streams
      // e.g. wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker
      const url = `wss://stream.binance.com:9443/stream?streams=${encodeURIComponent(
        streamsKey
          .split("/")
          .map((s) => `${s}@ticker`)
          .join("/"),
      )}`;

      ws = new WebSocket(url);

      ws.onopen = () => {
        retry = 0;
      };

      ws.onmessage = (ev) => {
        if (!alive) return;

        try {
          const msg = JSON.parse(ev.data as string);
          // combined stream format: { stream: "btcusdt@ticker", data: {...} }
          const d = msg?.data ?? msg;

          const sym = String(d?.s ?? "").toLowerCase();
          const last = Number(d?.c);
          const changePct = Number(d?.P);
          const quoteVol = Number(d?.q);

          if (!sym) return;

          setTickers((prev) => ({
            ...prev,
            [sym]: {
              last: Number.isFinite(last) ? last : (prev[sym]?.last ?? 0),
              changePct: Number.isFinite(changePct)
                ? changePct
                : (prev[sym]?.changePct ?? 0),
              quoteVol: Number.isFinite(quoteVol)
                ? quoteVol
                : (prev[sym]?.quoteVol ?? 0),
            },
          }));
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (!alive) return;
        retry += 1;
        const delay = Math.min(10_000, 400 * 2 ** retry);
        timer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
      ws?.close();
      ws = null;
    };
  }, [streamsKey]);

  return tickers;
}
