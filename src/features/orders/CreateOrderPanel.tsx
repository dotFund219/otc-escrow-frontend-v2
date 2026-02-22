import { useEffect, useMemo, useState } from "react";
import { decodeEventLog, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { useToast } from "../../components/ui/toast/ToastProvider";
import { ABI, ADDR, ERC20_ABI } from "../../lib/contract";
import AssetSelect from "../../components/ui/select/AssetSelect";
import { useBinanceTickers } from "../../hooks/useBinanceTickers";

type TokenKey = "WBTC" | "WETH" | "USDT" | "USDC";

const BASE_ASSET: Record<TokenKey, string> = {
  WBTC: "BTC",
  WETH: "ETH",
  USDT: "USDT",
  USDC: "USDC",
};

// This function determines Binance symbol based on sellKey/quoteKey.
// Possible combos: BTCUSDT, ETHUSDT, BTCUSDC, ETHUSDC, USDTUSDC, USDCUSDT, etc.
function toBinanceSymbol(sell: TokenKey, quote: TokenKey) {
  const base = BASE_ASSET[sell];
  const q = BASE_ASSET[quote];

  // if sell is a stablecoin, approximate 1:1 (special-case USDT/USDC below)
  if (sell === "USDT" && quote === "USDC") return "usdtusdc";
  if (sell === "USDC" && quote === "USDT") return "usdcusdt";

  // replace WBTC/WETH with BTC/ETH
  return `${base}${q}`.toLowerCase();
}

const TOKEN_OPTIONS: Array<{ key: TokenKey; label: string }> = [
  { key: "WBTC", label: "Wrapped Bitcoin" },
  { key: "WETH", label: "Wrapped Ethereum" },
  { key: "USDT", label: "USDT" },
  { key: "USDC", label: "USDC" },
];

function firstDifferentToken(from: TokenKey): TokenKey {
  const pick = TOKEN_OPTIONS.find((t) => t.key !== from)?.key;
  return pick ?? "USDT";
}

export function CreateOrderPanel() {
  const toast = useToast();
  const chainId = Number(import.meta.env.VITE_CHAIN_ID);
  const publicClient = usePublicClient({ chainId });
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Sell-only: the user always sells `sellToken` for `quoteToken`.
  const [sellKey, setSellKey] = useState<TokenKey>("WETH");
  const [quoteKey, setQuoteKey] = useState<TokenKey>("USDT");
  const [qty, setQty] = useState("");

  const sellToken = ADDR.tokens[sellKey];
  const quoteToken = ADDR.tokens[quoteKey];

  // ✅ (for estimates) reading quote token decimals yields more accurate display
  // const { data: quoteDecimals } = useReadContract({
  //   abi: ERC20_ABI,
  //   address: quoteToken,
  //   functionName: "decimals",
  //   args: [],
  // });

  // ✅ fetch price/changes/volume via Binance live ticker
  const priceSymbol = useMemo(
    () => toBinanceSymbol(sellKey, quoteKey),
    [sellKey, quoteKey],
  );

  const tickers = useBinanceTickers([priceSymbol]);

  // ✅ live price (null if unavailable)
  const livePrice = tickers[priceSymbol]?.last ?? null;

  // ✅ fee (bps). no contract getter so manage via env for now (e.g. 20 = 0.20%)
  const feeBps = Number(import.meta.env.VITE_FEE_BPS ?? 20);

  // ✅ calculate Estimated Total (quote) & Fee (quote) for UI
  const { estTotalQuote, estFeeQuote } = useMemo(() => {
    const q = qty.trim();
    if (!q)
      return {
        estTotalQuote: null as number | null,
        estFeeQuote: null as number | null,
      };
    const qtyNum = Number(q);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0)
      return { estTotalQuote: null, estFeeQuote: null };

    // 1) if both sell and quote are stablecoins approximate 1:1
    if (
      (sellKey === "USDT" || sellKey === "USDC") &&
      (quoteKey === "USDT" || quoteKey === "USDC")
    ) {
      const total = qtyNum; // ≈ 1:1
      const fee = (total * feeBps) / 10_000;
      return { estTotalQuote: total, estFeeQuote: fee };
    }

    // 2) otherwise use Binance live price * qty
    if (!livePrice || !Number.isFinite(livePrice))
      return { estTotalQuote: null, estFeeQuote: null };

    const total = qtyNum * livePrice;
    const fee = (total * feeBps) / 10_000;
    return { estTotalQuote: total, estFeeQuote: fee };
  }, [qty, livePrice, sellKey, quoteKey, feeBps]);

  // Enforce valid pair (sellToken !== quoteToken)
  useEffect(() => {
    if (sellKey === quoteKey) {
      setQuoteKey(firstDifferentToken(sellKey));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellKey]);

  // Fetch sell token decimals from chain
  const {
    data: sellDecimals,
    isLoading: sellDecimalsLoading,
    error: sellDecimalsError,
  } = useReadContract({
    abi: ERC20_ABI,
    address: sellToken,
    functionName: "decimals",
    args: [],
  });

  const sellAmount = useMemo(() => {
    const v = qty.trim();
    if (!v) return 0n;
    if (sellDecimals === undefined || sellDecimals === null) return 0n;

    try {
      return parseUnits(v as `${number}`, Number(sellDecimals));
    } catch {
      return 0n;
    }
  }, [qty, sellDecimals]);

  // Allowance check: owner = user, spender = Orders contract
  const { data: allowance } = useReadContract({
    abi: ERC20_ABI,
    address: sellToken,
    functionName: "allowance",
    args: address ? [address, ADDR.contracts.orders] : undefined,
    query: { enabled: Boolean(address) },
  });

  const needsApprove = useMemo(() => {
    if (!allowance) return true;
    return allowance < sellAmount;
  }, [allowance, sellAmount]);

  const pairInvalid = sellKey === quoteKey;

  const onCreate = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first.", {
        title: "Wallet not connected",
      });
      return;
    }

    if (!publicClient) {
      toast.error("Public client not initialized.", {
        title: "Network error",
      });
      return;
    }

    if (pairInvalid) {
      toast.error("Sell token and quote token must be different.", {
        title: "Invalid pair",
      });
      return;
    }

    if (sellDecimalsLoading) {
      toast.info("Loading token decimals…", { title: "Please wait" });
      return;
    }

    if (sellDecimalsError) {
      toast.error("Failed to read token decimals.", { title: "Token error" });
      return;
    }

    if (sellAmount <= 0n) {
      toast.error("Enter a valid quantity.", { title: "Invalid amount" });
      return;
    }

    try {
      // Step 1: approve sell token for Orders contract if needed
      if (needsApprove) {
        toast.info(`Approving ${sellKey}…`, { title: "Step 1/2" });

        const approveHash = await writeContractAsync({
          abi: ERC20_ABI,
          address: sellToken,
          functionName: "approve",
          args: [ADDR.contracts.orders, sellAmount],
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Step 2: create order
      toast.info("Creating order…", { title: "Step 2/2" });

      const orderHash = await writeContractAsync({
        abi: ABI.orders,
        address: ADDR.contracts.orders,
        functionName: "createOrder",
        args: [sellToken, sellAmount, quoteToken],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: orderHash,
      });

      // Extract orderId from OrderCreated event if available
      let createdId: string | null = null;
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({
            abi: ABI.orders,
            data: log.data,
            topics: log.topics,
          });

          if (ev.eventName === "OrderCreated") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createdId = (ev.args as any).orderId?.toString?.() ?? null;
            break;
          }
        } catch {
          // ignore non-matching logs
        }
      }

      toast.success(
        createdId ? `Order #${createdId} created` : "Order created",
        {
          title: "Success",
        },
      );

      setQty("");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Transaction failed", {
        title: "Error",
      });
    }
  };

  return (
    <div className="panel p-6">
      <div className="text-sm font-semibold">Create Order (Sell)</div>

      <div className="mt-4 space-y-3">
        <div>
          <AssetSelect
            comment="Sell Token"
            value={sellKey}
            onChange={(val) => setSellKey(val as TokenKey)}
          />
        </div>

        <div>
          <AssetSelect
            comment="Quote Token"
            value={quoteKey}
            onChange={(val) => setQuoteKey(val as TokenKey)}
          />

          {pairInvalid ? (
            <div className="text-xs mt-1 text-red-200">
              Invalid pair: choose a different quote token.
            </div>
          ) : (
            <div className="text-xs muted mt-1">
              Pair: {sellKey}/{quoteKey}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs muted mb-1">Quantity</div>
          <input
            className="input"
            placeholder="0.00"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <div className="text-xs muted mt-2">
            Quantity is encoded using the sell token&apos;s on-chain decimals{" "}
            {sellDecimalsLoading
              ? "(loading…)"
              : sellDecimals !== undefined && sellDecimals !== null
                ? `(decimals=${sellDecimals})`
                : ""}
            .
          </div>
        </div>

        <div className="panel-inset p-3 text-sm">
          <div className="flex justify-between">
            <span className="muted">Estimated Total</span>
            <span className="font-semibold">
              {estTotalQuote === null ? (
                <span className="muted">—</span>
              ) : (
                <>
                  ≈{" "}
                  {estTotalQuote.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}{" "}
                  {quoteKey}
                </>
              )}
            </span>
          </div>

          <div className="flex justify-between mt-1 text-xs">
            <span className="muted">Fee ({feeBps / 100}%)</span>
            <span className="muted">
              {estFeeQuote === null
                ? "—"
                : `≈ ${estFeeQuote.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${quoteKey}`}
            </span>
          </div>

          <div className="flex justify-between mt-2 text-xs">
            <span className="muted">Price Source</span>
            <span className="muted">
              {livePrice
                ? `Binance WS (${priceSymbol.toUpperCase()})`
                : "Waiting for live price…"}
            </span>
          </div>
        </div>

        <button
          className="btn w-full bg-emerald-500/20 hover:bg-emerald-500/25 border-emerald-400/20 text-emerald-200"
          onClick={onCreate}
          disabled={sellDecimalsLoading || pairInvalid}
          title={
            pairInvalid ? "Sell and quote tokens must be different" : undefined
          }
        >
          {sellDecimalsLoading
            ? "Loading decimals…"
            : needsApprove
              ? "Approve & Order"
              : "Order"}
        </button>
      </div>
    </div>
  );
}
