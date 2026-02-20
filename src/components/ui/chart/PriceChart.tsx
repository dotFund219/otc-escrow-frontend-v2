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

    async function load() {
      // Binance klines
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`;
      const res = await fetch(url);
      const raw = await res.json();

      if (cancelled) return;

      const data: CandlestickData[] = raw.map((k: any[]) => ({
        time: Math.floor(k[0] / 1000), // open time (sec)
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
      }));

      series.setData(data);
    }

    load();

    const onResize = () => chart.timeScale().fitContent();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [symbol, interval]);

  return <div ref={ref} className="h-[320px] w-full" />;
}
