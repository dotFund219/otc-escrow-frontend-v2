"use client";

import { useMemo } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useBalance,
  useBlockNumber,
  useReadContracts,
} from "wagmi";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

// ⚠️ 메인넷 컨트랙트 주소들 (다른 체인이면 여기 바꿔야 함)
const TOKENS = [
  {
    symbol: "USDT",
    address:
      import.meta.env.VITE_TOKEN_USDT ||
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    color: "text-emerald-400",
    fixed: 2,
  },
  {
    symbol: "USDC",
    address:
      import.meta.env.VITE_TOKEN_USDC ||
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    color: "text-cyan-400",
    fixed: 2,
  },
  {
    symbol: "WBTC",
    address:
      import.meta.env.VITE_TOKEN_WBTC ||
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    color: "text-amber-400",
    fixed: 6,
  },
  {
    symbol: "WETH",
    address:
      import.meta.env.VITE_TOKEN_WETH ||
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    color: "text-sky-400",
    fixed: 6,
  },
] as const;

function shortAddr(addr?: string) {
  if (!addr) return "0x... (address)";
  return `${addr.slice(0, 4)}...${addr.slice(-4)} (address)`;
}

function safeFixed(n: string, digits: number) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(digits);
}

export function WalletBalancePanel() {
  const { address, isConnected } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // Native ETH balance
  const { data: ethBal, isLoading: ethLoading } = useBalance({
    address,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  // ERC20 balances (multicall)
  const contracts = useMemo(() => {
    if (!address) return [];
    return TOKENS.map((t) => ({
      abi: ERC20_ABI,
      address: t.address as `0x${string}`,
      functionName: "balanceOf" as const,
      args: [address as `0x${string}`],
    }));
  }, [address]);

  const { data: erc20Res, isLoading: erc20Loading } = useReadContracts({
    contracts,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  // same shape as your mock: [{symbol, amount, color}]
  const walletBalances = useMemo(() => {
    const rows: { symbol: string; amount: string; color: string }[] = [];

    // ETH row (always first)
    const ethAmount =
      ethBal?.value != null
        ? safeFixed(formatUnits(ethBal.value, ethBal.decimals), 6)
        : "0.00";

    rows.push({
      symbol: "ETH",
      amount: ethLoading ? "…" : ethAmount,
      color: "text-emerald-400",
    });

    // ERC20 rows
    TOKENS.forEach((t, i) => {
      const raw = (erc20Res?.[i]?.result as bigint | undefined) ?? 0n;
      const formatted = formatUnits(raw, t.decimals);
      rows.push({
        symbol: t.symbol,
        amount: erc20Loading ? "…" : safeFixed(formatted, t.fixed),
        color: t.color,
      });
    });

    return rows;
  }, [ethBal, ethLoading, erc20Res, erc20Loading]);

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Wallet Balance</div>
        <div className="text-xs muted">
          {blockNumber ? `Block ${blockNumber.toString()}` : "Block —"}
        </div>
      </div>

      {!isConnected ? (
        <div className="mt-4 text-sm muted">Metamask 지갑을 연결해 주세요.</div>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {walletBalances.map((b) => (
              <div
                key={b.symbol}
                className="flex items-center justify-between text-sm"
              >
                <div className="muted">{b.symbol}</div>
                <div className={b.color}>{b.amount}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 text-xs muted">
            {shortAddr(address)}
          </div>
        </>
      )}
    </div>
  );
}
