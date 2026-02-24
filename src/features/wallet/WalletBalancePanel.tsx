"use client";

import { useMemo } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useBalance,
  useBlockNumber,
  useReadContracts,
} from "wagmi";
import { Wallet, RefreshCcw } from "lucide-react";
import { cx } from "../../lib/uifunctions";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

const TOKENS = [
  {
    symbol: "USDT",
    address:
      import.meta.env.VITE_TOKEN_USDT ||
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    accent: "bg-emerald-500/15 text-emerald-200 border-emerald-400/25",
    fixed: 2,
  },
  {
    symbol: "USDC",
    address:
      import.meta.env.VITE_TOKEN_USDC ||
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    accent: "bg-cyan-500/15 text-cyan-200 border-cyan-400/25",
    fixed: 2,
  },
  {
    symbol: "WBTC",
    address:
      import.meta.env.VITE_TOKEN_WBTC ||
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    accent: "bg-amber-500/15 text-amber-200 border-amber-400/25",
    fixed: 6,
  },
  {
    symbol: "WETH",
    address:
      import.meta.env.VITE_TOKEN_WETH ||
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    accent: "bg-sky-500/15 text-sky-200 border-sky-400/25",
    fixed: 6,
  },
] as const;

function shortAddr(addr?: string) {
  if (!addr) return "0x... (address)";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function safeFixed(n: string, digits: number) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(digits);
}

function SkeletonLine({ w = "w-24" }: { w?: string }) {
  return <div className={cx("h-4 rounded-md bg-white/10 animate-pulse", w)} />;
}

export function WalletBalancePanel() {
  const { address, isConnected } = useAccount();
  const {
    data: blockNumber,
    refetch: refetchBlock,
    isFetching: blockFetching,
  } = useBlockNumber({ watch: true });

  const {
    data: ethBal,
    isLoading: ethLoading,
    refetch: refetchEth,
    isFetching: ethFetching,
  } = useBalance({
    address,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const contracts = useMemo(() => {
    if (!address) return [];
    return TOKENS.map((t) => ({
      abi: ERC20_ABI,
      address: t.address as `0x${string}`,
      functionName: "balanceOf" as const,
      args: [address as `0x${string}`],
    }));
  }, [address]);

  const {
    data: erc20Res,
    isLoading: erc20Loading,
    refetch: refetchErc20,
    isFetching: erc20Fetching,
  } = useReadContracts({
    contracts,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const walletBalances = useMemo(() => {
    const rows: {
      symbol: string;
      amount: string;
      accent?: string;
      isLoading?: boolean;
    }[] = [];

    const ethAmount =
      ethBal?.value != null
        ? safeFixed(formatUnits(ethBal.value, ethBal.decimals), 6)
        : "0.00";

    rows.push({
      symbol: "ETH",
      amount: ethAmount,
      accent: "bg-emerald-500/15 text-emerald-200 border-emerald-400/25",
      isLoading: ethLoading,
    });

    TOKENS.forEach((t, i) => {
      const raw = (erc20Res?.[i]?.result as bigint | undefined) ?? 0n;
      const formatted = formatUnits(raw, t.decimals);
      rows.push({
        symbol: t.symbol,
        amount: safeFixed(formatted, t.fixed),
        accent: t.accent,
        isLoading: erc20Loading,
      });
    });

    return rows;
  }, [ethBal, ethLoading, erc20Res, erc20Loading]);

  const anyLoading =
    ethLoading || erc20Loading || ethFetching || erc20Fetching || blockFetching;

  return (
    <div className="panel p-6 relative overflow-hidden">
      {/* subtle exchange glow */}
      <div className="pointer-events-none absolute -top-28 -right-28 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-zinc-200" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight truncate">
              Wallet Balance
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-2">
                {/* use a real dot instead of Lucide Dot (more stable alignment) */}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isConnected && (
            <span
              className={cx(
                // ✅ match height to button (h-9)
                "inline-flex items-center h-9 px-3 rounded-xl border border-white/10 bg-white/5",
                "text-xs text-zinc-200 tabular-nums",
              )}
              title={address ?? ""}
            >
              {shortAddr(address)}
            </span>
          )}

          <button
            disabled={!address || anyLoading}
            className={cx(
              "h-9 w-9 rounded-xl border border-white/10 bg-white/5 transition flex items-center justify-center",
              !address || anyLoading
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-white/10",
            )}
            title="Refresh now"
            onClick={async () => {
              if (!address) return;
              try {
                await Promise.all([
                  refetchEth(),
                  refetchErc20(),
                  refetchBlock?.(),
                ]);
              } catch {}
            }}
          >
            <RefreshCcw
              size={16}
              className={cx(anyLoading && "animate-spin")}
            />
          </button>
        </div>
      </div>

      {!isConnected ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
          Please connect your Metamask wallet.
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="mt-5">
            <div className="panel-inset p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-zinc-400">Assets</div>
                  <div className="mt-1 text-lg font-semibold">
                    {anyLoading
                      ? "Updating…"
                      : `${walletBalances.length} tokens`}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="pill text-[10px] bg-white/5">
                    {blockNumber
                      ? `Block ${blockNumber.toString()}`
                      : "Block —"}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Auto refresh 10s
                  </span>
                </div>
              </div>

              {/* <div className="mt-3 text-xs text-zinc-500">
                Balances refresh every 10 seconds.
              </div> */}
            </div>
          </div>

          {/* Token rows */}
          <div className="mt-4 grid gap-3">
            {walletBalances.map((b) => (
              <div
                key={b.symbol}
                className="panel-inset p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cx(
                      "inline-flex items-center justify-center h-8 min-w-14 px-3 rounded-xl border text-xs font-semibold",
                      b.accent || "border-white/10 bg-white/5 text-zinc-200",
                    )}
                  >
                    {b.symbol}
                  </span>

                  <div className="text-xs text-zinc-500">Available balance</div>
                </div>

                <div className="text-right">
                  {b.isLoading ? (
                    <SkeletonLine w="w-28" />
                  ) : (
                    <div className="text-sm font-semibold text-zinc-100 tabular-nums">
                      {b.amount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
