import React from "react";

export type ItvRange = "1H" | "4H" | "1D" | "1W" | "1M";

type Props = {
  value?: ItvRange;
  defaultValue?: ItvRange;
  onChange?: (value: ItvRange) => void;
};

export function TimeframeOptions({
  value,
  defaultValue = "1D",
  onChange,
}: Props) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<ItvRange>(defaultValue);

  const selected = isControlled ? (value as ItvRange) : internal;

  const setSelected = (v: ItvRange) => {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  };

  const Btn = ({ v }: { v: ItvRange }) => {
    const active = selected === v;

    return (
      <button
        type="button"
        onClick={() => setSelected(v)}
        className={`
          relative px-4 py-1.5 rounded-full text-sm font-medium
          transition-all duration-200 ease-out
          border
          ${
            active
              ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
              : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 hover:shadow-md"
          }
          active:scale-95
        `}
      >
        {v}

        {/* subtle glow ring for active */}
        {active && (
          <span className="absolute inset-0 rounded-full ring-1 ring-emerald-400/30 pointer-events-none" />
        )}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <Btn v="1H" />
      <Btn v="4H" />
      <Btn v="1D" />
      <Btn v="1W" />
      <Btn v="1M" />

      <div className="ml-auto flex items-center gap-2 text-white/60">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <span className="text-xs tracking-wide">Real-time</span>
      </div>
    </div>
  );
}
