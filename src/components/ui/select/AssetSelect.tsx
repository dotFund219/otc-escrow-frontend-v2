import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

type Props = {
  value: string;
  onChange: (val: string) => void;
};

const assets = ["Wrapped Bitcoin", "Wrapped Ethereum", "USDT", "USDC"];

export default function AssetSelect({ value, onChange }: Props) {
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
      <label className="block text-sm text-zinc-400 mb-2">Asset</label>

      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 flex items-center justify-between hover:border-zinc-500 transition"
      >
        <span className="text-white">{value}</span>
        <ChevronDown size={18} className="text-zinc-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
          {assets.map((asset) => {
            const isActive = value === asset;
            return (
              <button
                key={asset}
                onClick={() => {
                  onChange(asset);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition
                ${
                  isActive
                    ? "bg-amber-500 text-black"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <span>{asset}</span>
                {isActive && <Check size={18} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
