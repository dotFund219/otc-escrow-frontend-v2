import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { isAddress } from "viem";
import { ADDR, ABI } from "../../../lib/contract";
import { useToast } from "../../../components/ui/toast/ToastProvider";

type AssetView = {
  enabled: boolean;
  chainlinkFeed: string;
  feedDecimals: number;
};

function pill(ok: boolean) {
  return ok
    ? "bg-emerald-500/12 border-emerald-400/20 text-emerald-200"
    : "bg-zinc-500/10 border-white/10 text-zinc-200/80";
}

function toInt(s: string, fallback = 0) {
  const n = Number(s);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

export function AdminConfigPanel() {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // -------------------------
  // Read: admin flag (display only)
  // -------------------------
  const { data: isAdmin } = useReadContract({
    address: ADDR.contracts.admin,
    abi: ABI.admin,
    functionName: "isAdmin",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  // -------------------------
  // Read: config core values
  // -------------------------
  const { data: treasury, refetch: refetchTreasury } = useReadContract({
    address: ADDR.contracts.config,
    abi: ABI.config,
    functionName: "treasury",
  });

  const { data: feeBps, refetch: refetchFee } = useReadContract({
    address: ADDR.contracts.config,
    abi: ABI.config,
    functionName: "feeBps",
  });

  const { data: spreadBps, refetch: refetchSpread } = useReadContract({
    address: ADDR.contracts.config,
    abi: ABI.config,
    functionName: "spreadBps",
  });

  // -------------------------
  // Local UI states (edit forms)
  // -------------------------
  const [treasuryInput, setTreasuryInput] = useState("");
  const [feeInput, setFeeInput] = useState("");
  const [spreadInput, setSpreadInput] = useState("");

  // Quote token allowlist tools
  const [quoteTokenAddr, setQuoteTokenAddr] = useState("");
  const [quoteAllowedTarget, setQuoteAllowedTarget] = useState(true);

  const { data: quoteAllowedRead, refetch: refetchQuoteAllowed } =
    useReadContract({
      address: ADDR.contracts.config,
      abi: ABI.config,
      functionName: "allowedQuoteTokens",
      args: isAddress(quoteTokenAddr)
        ? [quoteTokenAddr as `0x${string}`]
        : undefined,
      query: { enabled: isAddress(quoteTokenAddr) },
    });

  // Asset set tools
  const [assetToken, setAssetToken] = useState("");
  const [assetFeed, setAssetFeed] = useState("");
  const [assetEnabled, setAssetEnabled] = useState(true);

  const { data: assetCfgRead, refetch: refetchAssetCfg } = useReadContract({
    address: ADDR.contracts.config,
    abi: ABI.config,
    functionName: "assets",
    args: isAddress(assetToken) ? [assetToken as `0x${string}`] : undefined,
    query: { enabled: isAddress(assetToken) },
  });

  // Oracle price tools
  const [oracleToken, setOracleToken] = useState("");
  const { data: oraclePriceRead, refetch: refetchOracle } = useReadContract({
    address: ADDR.contracts.config,
    abi: ABI.config,
    functionName: "getOraclePrice",
    args: isAddress(oracleToken) ? [oracleToken as `0x${string}`] : undefined,
    query: { enabled: isAddress(oracleToken) },
  });

  // Sync inputs from reads (once they arrive)
  useEffect(() => {
    if (treasury && typeof treasury === "string") setTreasuryInput(treasury);
  }, [treasury]);

  useEffect(() => {
    if (typeof feeBps === "bigint") setFeeInput(String(feeBps));
  }, [feeBps]);

  useEffect(() => {
    if (typeof spreadBps === "bigint") setSpreadInput(String(spreadBps));
  }, [spreadBps]);

  const assetView: AssetView | null = useMemo(() => {
    // TypeORM struct: { enabled, chainlinkFeed, feedDecimals }
    // wagmi returns as object or tuple depending on ABI typing
    if (!assetCfgRead) return null;

    // Handle both object and tuple shapes
    const anyCfg: any = assetCfgRead as any;
    const enabled = Boolean(anyCfg.enabled ?? anyCfg[0]);
    const chainlinkFeed = String(anyCfg.chainlinkFeed ?? anyCfg[1] ?? "");
    const feedDecimals = Number(anyCfg.feedDecimals ?? anyCfg[2] ?? 0);

    return { enabled, chainlinkFeed, feedDecimals };
  }, [assetCfgRead]);

  const oracleView = useMemo(() => {
    if (!oraclePriceRead) return null;
    const anyP: any = oraclePriceRead as any;

    // getOraclePrice returns (uint256 price, uint8 decimals_)
    const price = BigInt(anyP.price ?? anyP[0] ?? 0n);
    const dec = Number(anyP.decimals_ ?? anyP[1] ?? 0);

    return { price, dec };
  }, [oraclePriceRead]);

  async function runWrite(
    label: string,
    fn: () => Promise<any>,
    after?: () => Promise<any>,
  ) {
    try {
      toast.success("Submitting transaction…", { title: label });
      const hash = await fn();

      console.log(hash);
      // you can display the hash here if needed
      toast.success("Transaction submitted", { title: label });
      if (after) await after();
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Transaction failed", {
        title: label,
      });
    }
  }

  async function refreshAll() {
    await Promise.allSettled([
      refetchTreasury(),
      refetchFee(),
      refetchSpread(),
    ]);
    if (isAddress(quoteTokenAddr)) await refetchQuoteAllowed();
    if (isAddress(assetToken)) await refetchAssetCfg();
    if (isAddress(oracleToken)) await refetchOracle();
  }

  return (
    <div className="panel-inset p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Config</div>
          <div className="text-sm muted">
            OTCAdmin + OTCConfig operational settings (fee/spread/treasury,
            quote allowlist, asset feeds)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold border ${pill(
              !!isAdmin,
            )}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            {isAdmin ? "Admin wallet" : "Not admin"}
          </span>

          <button className="btn" onClick={refreshAll}>
            Refresh
          </button>
        </div>
      </div>

      {/* Row 1: Core config */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <div className="panel-inset p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Core Settings</div>
                <div className="text-xs muted mt-1">
                  treasury / feeBps / spreadBps
                </div>
              </div>
              <span className="pill text-[11px]">
                fee: {typeof feeBps === "bigint" ? `${feeBps} bps` : "-"} •
                spread:{" "}
                {typeof spreadBps === "bigint" ? `${spreadBps} bps` : "-"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-12 gap-3">
              <div className="col-span-12">
                <div className="text-xs muted mb-1">Treasury</div>
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1 font-mono text-xs"
                    value={treasuryInput}
                    onChange={(e) => setTreasuryInput(e.target.value)}
                    placeholder="0x..."
                  />
                  <button
                    className="btn btn-primary"
                    disabled={!isAddress(treasuryInput)}
                    onClick={() =>
                      runWrite(
                        "Set treasury",
                        () =>
                          writeContractAsync({
                            address: ADDR.contracts.config,
                            abi: ABI.config,
                            functionName: "setTreasury",
                            args: [treasuryInput as `0x${string}`],
                          }),
                        async () => {
                          await refetchTreasury();
                        },
                      )
                    }
                  >
                    Save
                  </button>
                </div>
                <div className="text-[11px] muted mt-1">
                  Current:{" "}
                  <span className="font-mono">
                    {typeof treasury === "string" ? treasury : "-"}
                  </span>
                </div>
              </div>

              <div className="col-span-12 md:col-span-6">
                <div className="text-xs muted mb-1">Fee (bps)</div>
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    placeholder="0..500"
                    inputMode="numeric"
                  />
                  <button
                    className="btn btn-primary"
                    disabled={toInt(feeInput, -1) < 0}
                    onClick={() =>
                      runWrite(
                        "Set feeBps",
                        () =>
                          writeContractAsync({
                            address: ADDR.contracts.config,
                            abi: ABI.config,
                            functionName: "setFeeBps",
                            args: [BigInt(toInt(feeInput, 0))],
                          }),
                        async () => {
                          await refetchFee();
                        },
                      )
                    }
                  >
                    Save
                  </button>
                </div>
                <div className="text-[11px] muted mt-1">
                  30 = 0.30% (in bps)
                </div>
              </div>

              <div className="col-span-12 md:col-span-6">
                <div className="text-xs muted mb-1">Spread (bps)</div>
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={spreadInput}
                    onChange={(e) => setSpreadInput(e.target.value)}
                    placeholder="0..2000"
                    inputMode="numeric"
                  />
                  <button
                    className="btn btn-primary"
                    disabled={toInt(spreadInput, -1) < 0}
                    onClick={() =>
                      runWrite(
                        "Set spreadBps",
                        () =>
                          writeContractAsync({
                            address: ADDR.contracts.config,
                            abi: ABI.config,
                            functionName: "setSpreadBps",
                            args: [BigInt(toInt(spreadInput, 0))],
                          }),
                        async () => {
                          await refetchSpread();
                        },
                      )
                    }
                  >
                    Save
                  </button>
                </div>
                <div className="text-[11px] muted mt-1">
                  spread is added on top of oracle price
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right card: quick status */}
        <div className="col-span-12 lg:col-span-5">
          <div className="panel-inset p-4">
            <div className="font-semibold">Runtime</div>
            <div className="text-xs muted mt-1">
              check connection status and current contract addresses
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] muted">Admin Contract</div>
                <div className="font-mono text-xs mt-1 break-all">
                  {ADDR.contracts.admin}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] muted">Config Contract</div>
                <div className="font-mono text-xs mt-1 break-all">
                  {ADDR.contracts.config}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-[11px] muted">Connected Wallet</div>
                <div className="font-mono text-xs mt-1 break-all">
                  {address || "-"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Quote token allowlist */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6">
          <div className="panel-inset p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Quote Token Allowlist</div>
                <div className="text-xs muted mt-1">
                  view/set allowedQuoteTokens(token)
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold border ${pill(
                  !!quoteAllowedRead,
                )}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                {isAddress(quoteTokenAddr)
                  ? quoteAllowedRead
                    ? "Allowed"
                    : "Not allowed"
                  : "Enter token"}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-xs muted mb-1">Token Address</div>
              <input
                className="input font-mono text-xs"
                placeholder="0x..."
                value={quoteTokenAddr}
                onChange={(e) => setQuoteTokenAddr(e.target.value)}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={quoteAllowedTarget}
                  onChange={(e) => setQuoteAllowedTarget(e.target.checked)}
                />
                Set as allowed
              </label>

              <div className="flex items-center gap-2">
                <button
                  className="btn"
                  disabled={!isAddress(quoteTokenAddr)}
                  onClick={() => refetchQuoteAllowed()}
                >
                  Check
                </button>

                <button
                  className="btn btn-primary"
                  disabled={!isAddress(quoteTokenAddr)}
                  onClick={() =>
                    runWrite(
                      "Set quote token",
                      () =>
                        writeContractAsync({
                          address: ADDR.contracts.config,
                          abi: ABI.config,
                          functionName: "setQuoteToken",
                          args: [
                            quoteTokenAddr as `0x${string}`,
                            quoteAllowedTarget,
                          ],
                        }),
                      async () => {
                        await refetchQuoteAllowed();
                      },
                    )
                  }
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="text-[11px] muted mt-2">
              In Phase 1 we recommend putting only USDT/USDC etc. on the
              allowlist
            </div>
          </div>
        </div>

        {/* Row 2 right: Asset feed */}
        <div className="col-span-12 lg:col-span-6">
          <div className="panel-inset p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Asset Feed Config</div>
                <div className="text-xs muted mt-1">
                  view assets(token) + setAsset(token, feed, enabled)
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold border ${
                  assetView?.enabled ? pill(true) : pill(false)
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                {assetView
                  ? assetView.enabled
                    ? "Enabled"
                    : "Disabled"
                  : "Enter token"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-12 gap-3">
              <div className="col-span-12">
                <div className="text-xs muted mb-1">Asset Token</div>
                <input
                  className="input font-mono text-xs"
                  placeholder="0x..."
                  value={assetToken}
                  onChange={(e) => setAssetToken(e.target.value)}
                />
              </div>

              <div className="col-span-12">
                <div className="text-xs muted mb-1">Chainlink Feed</div>
                <input
                  className="input font-mono text-xs"
                  placeholder="0x..."
                  value={assetFeed}
                  onChange={(e) => setAssetFeed(e.target.value)}
                />
              </div>

              <div className="col-span-12 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={assetEnabled}
                    onChange={(e) => setAssetEnabled(e.target.checked)}
                  />
                  Enabled
                </label>

                <div className="flex items-center gap-2">
                  <button
                    className="btn"
                    disabled={!isAddress(assetToken)}
                    onClick={() => refetchAssetCfg()}
                  >
                    Check
                  </button>

                  <button
                    className="btn btn-primary"
                    disabled={!isAddress(assetToken) || !isAddress(assetFeed)}
                    onClick={() =>
                      runWrite(
                        "Set asset feed",
                        () =>
                          writeContractAsync({
                            address: ADDR.contracts.config,
                            abi: ABI.config,
                            functionName: "setAsset",
                            args: [
                              assetToken as `0x${string}`,
                              assetFeed as `0x${string}`,
                              assetEnabled,
                            ],
                          }),
                        async () => {
                          await refetchAssetCfg();
                        },
                      )
                    }
                  >
                    Apply
                  </button>
                </div>
              </div>

              {assetView && (
                <div className="col-span-12 rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[11px] muted">Current config</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="muted">enabled</div>
                    <div>{String(assetView.enabled)}</div>
                    <div className="muted">feed</div>
                    <div className="font-mono break-all">
                      {assetView.chainlinkFeed}
                    </div>
                    <div className="muted">feedDecimals</div>
                    <div>{assetView.feedDecimals}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Oracle price checker */}
      <div className="mt-4">
        <div className="panel-inset p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Oracle Price Checker</div>
              <div className="text-xs muted mt-1">
                check getOraclePrice(token)
              </div>
            </div>

            {oracleView ? (
              <span className="pill text-[11px]">
                price: {oracleView.price.toString()} • decimals:{" "}
                {oracleView.dec}
              </span>
            ) : (
              <span className="pill text-[11px]">-</span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              className="input flex-1 font-mono text-xs"
              placeholder="token address (0x...)"
              value={oracleToken}
              onChange={(e) => setOracleToken(e.target.value)}
            />
            <button
              className="btn btn-primary"
              disabled={!isAddress(oracleToken)}
              onClick={() => refetchOracle()}
            >
              Fetch
            </button>
          </div>

          <div className="text-[11px] muted mt-2">
            The value is returned as (price, feedDecimals) unchanged; add UI
            conversion if needed.
          </div>
        </div>
      </div>
    </div>
  );
}
