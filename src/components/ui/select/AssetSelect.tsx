import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

type Props = {
  comment: string;
  value: string;
  onChange: (val: string) => void;
};

type TokenKey = "WBTC" | "WETH" | "USDT" | "USDC";

const TOKEN_OPTIONS: Array<{ key: TokenKey; label: string }> = [
  { key: "WBTC", label: "Wrapped Bitcoin" },
  { key: "WETH", label: "Wrapped Ethereum" },
  { key: "USDT", label: "USDT" },
  { key: "USDC", label: "USDC" },
];

export default function AssetSelect({ comment, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-78 relative" ref={ref}>
      <label className="text-xs muted mb-1">{comment}</label>

      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-zinc-1100 border border-zinc-800 rounded-xl px-4 py-2 flex items-center justify-between hover:border-emerald-800 transition"
      >
        <span className="text-white">
          {TOKEN_OPTIONS.find((t) => t.key === value)?.label}
        </span>
        <ChevronDown size={18} className="text-zinc-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
          {TOKEN_OPTIONS.map((asset) => {
            const isActive = value === asset.key;
            return (
              <button
                key={asset.key}
                onClick={() => {
                  onChange(asset.key);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition
                ${
                  isActive
                    ? "bg-amber-500 text-black"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <span>{asset.label}</span>
                {isActive && <Check size={18} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
