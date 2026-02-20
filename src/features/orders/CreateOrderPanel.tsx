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

type TokenKey = "WBTC" | "WETH" | "USDT" | "USDC";

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

  // Enforce valid pair (sellToken !== quoteToken)
  useEffect(() => {
    if (sellKey === quoteKey) {
      setQuoteKey(firstDifferentToken(sellKey));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellKey]);

  const sellToken = ADDR.tokens[sellKey];
  const quoteToken = ADDR.tokens[quoteKey];

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
          <div className="text-xs muted mb-1">Sell Token</div>
          <select
            className="select"
            value={sellKey}
            onChange={(e) => setSellKey(e.target.value as TokenKey)}
          >
            {TOKEN_OPTIONS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>

          <AssetSelect
            value={sellKey}
            onChange={(val) => setSellKey(val as TokenKey)}
          />
        </div>

        <div>
          <div className="text-xs muted mb-1">Quote Token</div>
          <select
            className="select"
            value={quoteKey}
            onChange={(e) => setQuoteKey(e.target.value as TokenKey)}
          >
            {TOKEN_OPTIONS.map((t) => (
              <option key={t.key} value={t.key} disabled={t.key === sellKey}>
                {t.label}
              </option>
            ))}
          </select>

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
            <span className="muted">Computed on-chain</span>
          </div>
          <div className="flex justify-between mt-1 text-xs muted">
            <span>Fee</span>
            <span className="muted">Computed on-chain</span>
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
