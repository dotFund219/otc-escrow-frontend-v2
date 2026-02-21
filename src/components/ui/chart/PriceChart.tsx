import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type CandlestickData,
  type IChartApi,
} from "lightweight-charts";

type Props = {
  symbol?: string; // e.g : "BTCUSDT"
  interval?: string; // e.g : "1m", "5m", "1h", "1d"
};

type BinanceKlineMsg = {
  e: "kline";
  E: number;
  s: string;
  k: {
    t: number; // open time (ms)
    T: number; // close time (ms)
    s: string;
    i: string;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    x: boolean; // is this kline closed?
  };
};

export default function PriceChart({
  symbol = "BTCUSDT",
  interval = "1h",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)" },
    }) as IChartApi;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      borderVisible: false,
    });

    let cancelled = false;

    // track last candle time (seconds)
    let lastTimeSec: number | null = null;

    async function loadHistory() {
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`;
      const res = await fetch(url);
      const raw = await res.json();

      if (cancelled) return;

      const data: CandlestickData[] = raw.map((k: any[]) => ({
        time: Math.floor(k[0] / 1000),
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
      }));

      series.setData(data);
      lastTimeSec = data.length ? (data[data.length - 1].time as number) : null;
      chart.timeScale().fitContent();
    }

    // ✅ WS connection (includes auto-reconnect)
    let ws: WebSocket | null = null;
    let retry = 0;
    let retryTimer: number | null = null;

    const connectWs = () => {
      const streamName = `${symbol.toLowerCase()}@kline_${interval}`; // stream name pattern
      const url = `wss://stream.binance.com:9443/ws/${streamName}`; // base endpoint :contentReference[oaicite:2]{index=2}

      ws = new WebSocket(url);

      ws.onopen = () => {
        retry = 0;
      };

      ws.onmessage = (ev) => {
        if (cancelled) return;

        try {
          const msg = JSON.parse(ev.data as string) as BinanceKlineMsg;
          const k = msg?.k;
          if (!k?.t) return;

          const candle: CandlestickData = {
            time: Math.floor(k.t / 1000) as any,
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
          };

          // series.update updates current candle if time matches, adds a new one if time is new
          series.update(candle);

          // update last time (optional)
          lastTimeSec = candle.time as number;

          // optionally, auto-scroll toward the latest candle
          // chart.timeScale().scrollToRealTime();
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        retry += 1;
        const delay = Math.min(10_000, 400 * 2 ** retry);
        retryTimer = window.setTimeout(connectWs, delay);
      };

      ws.onerror = () => {
        // usually onclose follows, so skip here
      };
    };

    loadHistory().then(() => {
      if (!cancelled) connectWs();
    });

    const onResize = () => chart.timeScale().fitContent();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (retryTimer) window.clearTimeout(retryTimer);
      ws?.close();
      ws = null;
      chart.remove();
    };
  }, [symbol, interval]);

  return <div ref={ref} className="h-[320px] w-full" />;
}
