import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import {
  fetchOrders,
  fetchPublicOrderBook,
  type OrderStatus,
  type OtcOrder,
} from "../../lib/api/orders";
import { formatPrice, formatUnits, getTokenMeta } from "../../lib/tokenMeta";
import { IconRefreshButton } from "../../components/ui/button/IconRefreshButton";
import { ADDR } from "../../lib/contract";
import { useAccount } from "wagmi";
import { useToast } from "../../components/ui/toast/ToastProvider";
import { approveAndTakeOrder } from "../../lib/web3/takeOrder";
import { SubmitTxIdDialog } from "../../components/ui/dialog/SubmitTxIdDialog";
import { submitDeliveryTx } from "../../lib/web3/submitDeliveryTx";
import { ConfirmReceiptDialog } from "../../components/ui/dialog/ConfirmReceiptDialog";
import { confirmReceipt } from "../../lib/web3/confirmReceipt";
import { useSiweAuth } from "../auth/useSiweAuth";

function shortAddr(a?: string | null, left = 6, right = 4) {
  if (!a) return "-";
  if (a.length <= left + right) return a;
  return `${a.slice(0, left)}…${a.slice(-right)}`;
}

/** Matches your API shape: 401: {"message":"Unauthorized","statusCode":401} */
function isUnauthorized(e: any): boolean {
  if (!e) return false;

  // 1. direct object
  if (e.statusCode === 401 || e.status === 401) return true;
  if (e.response?.status === 401) return true;
  if (e.response?.data?.statusCode === 401) return true;

  // 2. message string
  const msg =
    typeof e === "string" ? e : (e.message ?? e.response?.data?.message ?? "");

  const lower = String(msg).toLowerCase();

  if (lower.includes("unauthorized")) return true;
  if (lower.includes("401")) return true;

  // 3. extract JSON inside string
  // e.g. "Orders API error 401: {\"message\":\"unauthorized\",\"statuscode\":401}"
  const match = lower.match(/\{.*\}/);

  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.statuscode === 401) return true;
      if (parsed.statusCode === 401) return true;
      if (parsed.message?.toLowerCase() === "unauthorized") return true;
    } catch {}
  }

  return false;
}

export function OrderBook({ compact }: { compact?: boolean }) {
  const toast = useToast();
  const { token } = useSiweAuth();

  const REFRESH_SEC = 5;
  const [countdown, setCountdown] = useState(REFRESH_SEC);
  const refreshingRef = useRef(false);

  const [orders, setOrders] = useState<OtcOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);

  const [meta, setMeta] = useState<
    Record<string, { symbol: string; decimals: number }>
  >({});

  const chainId = Number(import.meta.env.VITE_CHAIN_ID || 1);
  const limit = 25;

  const { address, isConnected } = useAccount();

  const [txidOpen, setTxidOpen] = useState(false);
  const [txidOrderId, setTxidOrderId] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [takingId, setTakingId] = useState<string | null>(null);

  // ✅ compact(private orders) auth state
  const [authRequired, setAuthRequired] = useState(false);
  const authToastShownRef = useRef(false);

  async function loadTokenMeta(list: OtcOrder[]) {
    try {
      const uniq = new Set<string>();
      for (const o of list) {
        uniq.add(o.sellToken.toLowerCase());
        uniq.add(o.quoteToken.toLowerCase());
      }

      const entries = await Promise.all(
        [...uniq].map(async (addrLower) => {
          const m = await getTokenMeta(chainId, addrLower);
          return [addrLower, m] as const;
        }),
      );

      setMeta((prev) => {
        const next = { ...prev };
        for (const [k, v] of entries) next[k] = v;
        return next;
      });
    } catch (e) {
      // metadata fetch failure is not critical
      console.warn("token meta load failed", e);
    }
  }

  const enterAuthRequired = () => {
    setAuthRequired(true);
    setOrders([]);
    setNextCursor(null);
    setHasLoadedMore(false);
    setErr(null);

    // show toast only once (more “exchange-like” UX)
    if (!authToastShownRef.current) {
      authToastShownRef.current = true;
      toast.error("Session expired. Please sign in to view your orders.", {
        title: "Authentication required",
      });
    }
  };

  const exitAuthRequired = () => {
    setAuthRequired(false);
    authToastShownRef.current = false;
  };

  // ✅ load first page (refresh)
  const loadFirstPage = async () => {
    setLoading(true);
    setErr(null);

    // compact(private) mode: if no token, show CTA
    if (compact !== undefined && !token) {
      enterAuthRequired();
      setLoading(false);
      return;
    }

    try {
      const data =
        compact == undefined
          ? await fetchPublicOrderBook({ chainId, limit })
          : await fetchOrders(token!);

      const list = data.orders ?? [];
      setOrders(list);
      setNextCursor(data.nextCursor ?? null);
      setHasLoadedMore(false);

      if (compact !== undefined) exitAuthRequired();

      await loadTokenMeta(list);
    } catch (e: any) {
      // ✅ compact(private) mode: 401 => show CTA instead of errors
      if (compact !== undefined && isUnauthorized(e)) {
        enterAuthRequired();
      } else {
        setErr(e?.message ?? "Failed to load orderbook");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ load next page (append)
  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setErr(null);

    try {
      const data = await fetchPublicOrderBook({
        chainId,
        limit,
        cursor: nextCursor,
      });

      const list = data.orders ?? [];
      setOrders((prev) => {
        // dedupe (based on orderId)
        const seen = new Set(prev.map((x) => `${x.chainId}:${x.orderId}`));
        const appended = list.filter(
          (x) => !seen.has(`${x.chainId}:${x.orderId}`),
        );
        return [...prev, ...appended];
      });

      setNextCursor(data.nextCursor ?? null);
      setHasLoadedMore(true);

      await loadTokenMeta(list);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load more orders");
    } finally {
      setLoadingMore(false);
    }
  };

  // ✅ auto refresh: safely refresh only the first page
  useEffect(() => {
    let t: number | null = null;

    loadFirstPage();

    t = window.setInterval(async () => {
      setCountdown((prev) => {
        if (prev <= 1) return REFRESH_SEC;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (t) window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, hasLoadedMore, compact, token]);

  useEffect(() => {
    if (countdown !== REFRESH_SEC) return;

    // ✅ compact + authRequired => stop hammering API
    if (compact !== undefined && authRequired) return;

    if (refreshingRef.current) return;
    if (loading) return;

    refreshingRef.current = true;
    Promise.resolve()
      .then(async () => {
        if (hasLoadedMore) {
          // existing logic: refresh only the top page, keep the rest
          const data = await fetchPublicOrderBook({ chainId, limit });
          const first = data.orders ?? [];
          setNextCursor(data.nextCursor ?? null);

          setOrders((prev) => {
            const keep = prev.slice(first.length);
            return [...first, ...keep];
          });

          await loadTokenMeta(first);
        } else {
          await loadFirstPage();
        }
      })
      .finally(() => {
        refreshingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, authRequired, compact]);

  const onTakeOrder = async (orderId: string) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first.", {
        title: "Wallet not connected",
      });
      return;
    }

    if (takingId) return;

    const order = orders.find((o) => o.orderId === orderId);
    if (!order) {
      toast.error("Order not found", { title: "Error" });
      return;
    }

    try {
      setTakingId(orderId);

      await approveAndTakeOrder({
        orderId,
        chainId,
        contract: ADDR.contracts.orders,
        quoteToken: order.quoteToken,
        quoteAmount: order.quoteAmount ?? "0",
      });

      toast.success("Order taken successfully", { title: "Success" });
      await loadFirstPage();
    } catch (e: any) {
      toast.error("Failed to take order: " + (e?.message ?? "Unknown error"), {
        title: "Error",
      });
    } finally {
      setTakingId(null);
    }
  };

  function Spinner({ className }: { className?: string }) {
    return (
      <span
        className={clsx(
          "inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white",
          className,
        )}
      />
    );
  }

  const STATUS_STYLE: Record<OrderStatus, string> = {
    OPEN: "bg-emerald-500/10 text-emerald-200 border-emerald-400/15",
    TAKEN: "bg-amber-500/10 text-amber-200 border-amber-400/15",
    DELIVERED: "bg-sky-500/10 text-sky-200 border-sky-400/15",
    FINISHED: "bg-violet-500/10 text-violet-200 border-violet-400/15",
    CANCELLED: "bg-white/5 text-white/60 border-white/10",
  };

  return (
    <div
      className={clsx("panel p-6", compact && "p-0 bg-transparent shadow-none")}
    >
      {loading && orders.length === 0 && !authRequired && (
        <div className="border-t border-white/10 px-4 py-6 text-sm muted">
          Loading order book...
        </div>
      )}

      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Order Book</div>
            <div className="mt-1 text-xs text-white/50">
              Live • {orders.length} orders
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="pill text-xs bg-white/5">
              Refresh in{" "}
              <span className="font-semibold text-zinc-100">{countdown}s</span>
            </div>
            <IconRefreshButton
              loading={loading}
              onClick={() => {
                setCountdown(REFRESH_SEC);
                loadFirstPage();
              }}
            />
          </div>
        </div>
      )}

      <div className={clsx("mt-4", compact && "mt-0")}>
        {/* ✅ compact/private + token expired => exchange-like CTA */}
        {compact !== undefined && authRequired && (
          <div className="rounded-2xl border border-white/10 bg-black/25 overflow-hidden">
            <div className="px-5 py-10 text-center">
              <div className="text-3xl opacity-60 mb-3">🔒</div>

              <div className="text-sm font-semibold text-zinc-200">
                Login required
              </div>

              <div className="text-xs text-zinc-500 mt-2">
                Your session has expired. Sign in to view your orders.
              </div>

              <div className="mt-5 flex items-center justify-center gap-2">
                <a
                  href="/auth"
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold
                  bg-emerald-500/90 hover:bg-emerald-500 text-black transition"
                >
                  Sign in / Create account
                </a>

                <button
                  className="btn px-4 py-2 text-xs"
                  onClick={() => {
                    setCountdown(REFRESH_SEC);
                    loadFirstPage();
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Normal orderbook table */}
        {!(compact !== undefined && authRequired) && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 overflow-hidden">
            <div className="max-h-[520px] overflow-auto">
              {/* ✅ Sticky header */}
              <div
                className="sticky top-0 z-10 grid grid-cols-7
                bg-black/60 backdrop-blur-xl
                text-[11px] tracking-wider text-white/45
                px-4 py-2 border-b border-white/10"
              >
                <div>TYPE</div>
                <div>PAIR</div>
                <div className="text-right">QUANTITY</div>
                <div className="text-right">PRICE</div>
                <div className="text-right">TOTAL</div>
                <div className="text-center">STATUS</div>
                <div className="text-right">ACTION</div>
              </div>

              {err && (
                <div className="px-4 py-3 text-sm border-t border-white/10 text-red-200">
                  {err}
                </div>
              )}

              {!err && orders.length === 0 && (
                <div className="border-t border-white/10">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-4xl opacity-40 mb-3">📭</div>

                    <div className="text-sm font-medium text-zinc-300">
                      No open orders
                    </div>

                    <div className="text-xs text-zinc-500 mt-1">
                      There are currently no active orders for this pair.
                    </div>

                    <button
                      className="btn mt-4 px-4 py-2 text-xs"
                      onClick={loadFirstPage}
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              )}

              {orders.map((o) => {
                const sellAddr = o.sellToken.toLowerCase();
                const quoteAddr = o.quoteToken.toLowerCase();

                const sellMeta = meta[sellAddr] ?? {
                  symbol: shortAddr(o.sellToken),
                  decimals: 18,
                };
                const quoteMeta = meta[quoteAddr] ?? {
                  symbol: shortAddr(o.quoteToken),
                  decimals: 18,
                };

                const qtyHuman = formatUnits(
                  o.sellAmount,
                  sellMeta.decimals,
                  6,
                );
                const totalHuman = formatUnits(
                  o.quoteAmount,
                  quoteMeta.decimals,
                  4,
                );

                const priceHuman = formatPrice(
                  o.quoteAmount,
                  quoteMeta.decimals,
                  o.sellAmount,
                  sellMeta.decimals,
                  6,
                );

                const pair = `${sellMeta.symbol}/${quoteMeta.symbol}`;

                const TYPE_STYLE: Record<string, string> = {
                  SELL: "bg-red-500/10 border-red-400/20 text-red-300",
                  BUY: "bg-emerald-500/10 border-emerald-400/20 text-emerald-300",
                  UNKNOWN: "bg-white/5 border-white/10 text-white/50",
                  "NOT TAKEN": "bg-white/5 border-white/10 text-white/50",
                };

                const role =
                  o.seller?.toLowerCase() === address?.toLowerCase()
                    ? "SELL"
                    : o.buyer?.toLowerCase() === address?.toLowerCase()
                      ? "BUY"
                      : "NOT TAKEN";

                return (
                  <div
                    key={`${o.chainId}:${o.orderId}`}
                    className={clsx(
                      "grid grid-cols-7 px-4 py-3 text-sm border-b border-white/5",
                      "hover:bg-white/[0.04] hover:border-white/10 transition",
                    )}
                  >
                    <div className="flex items-center">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1 text-[11px] font-semibold border",
                          TYPE_STYLE[role],
                        )}
                      >
                        <span
                          className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            role === "SELL"
                              ? "bg-red-400"
                              : role === "BUY"
                                ? "bg-emerald-400"
                                : "bg-white/40",
                          )}
                        />
                        {role}
                      </span>
                    </div>

                    {/* PAIR */}
                    <div className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                      {pair}
                    </div>

                    {/* QUANTITY */}
                    <div className="text-right tabular-nums whitespace-nowrap">
                      {qtyHuman}{" "}
                      <span className="text-white/45">{sellMeta.symbol}</span>
                    </div>

                    {/* PRICE */}
                    <div className="text-right tabular-nums whitespace-nowrap">
                      {priceHuman}{" "}
                      <span className="text-white/45">{quoteMeta.symbol}</span>
                    </div>

                    {/* TOTAL */}
                    <div className="text-right tabular-nums whitespace-nowrap">
                      {totalHuman}{" "}
                      <span className="text-white/45">{quoteMeta.symbol}</span>
                    </div>

                    {/* STATUS */}
                    <div className="flex justify-center">
                      <span
                        className={clsx(
                          "inline-flex justify-center w-[110px] h-[24px] whitespace-nowrap rounded-xl px-3 py-1 text-[11px] font-semibold border",
                          STATUS_STYLE[o.status],
                        )}
                      >
                        {o.status}
                      </span>
                    </div>

                    {/* ACTION */}
                    <div className="text-right">
                      {(() => {
                        const isSeller =
                          address &&
                          o.seller?.toLowerCase() === address.toLowerCase();
                        const isBuyer =
                          address &&
                          o.buyer?.toLowerCase() === address.toLowerCase();

                        // 🔴 OPEN
                        if (o.status === "OPEN") {
                          const isTakingThis = takingId === o.orderId;

                          if (!isConnected) {
                            return (
                              <button
                                className="btn py-1 px-3 text-xs"
                                onClick={() =>
                                  toast.error("Connect wallet first")
                                }
                              >
                                Connect
                              </button>
                            );
                          }

                          if (isSeller) {
                            return (
                              <button
                                disabled
                                className="
                                  inline-flex items-center justify-center
                                  rounded-xl px-4 py-1.5 text-xs font-medium
                                  bg-white/5 border border-white/10
                                  text-white/40
                                  cursor-not-allowed
                                "
                              >
                                Your Order
                              </button>
                            );
                          }

                          return (
                            <button
                              disabled={isTakingThis}
                              className={clsx(
                                "inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                                isTakingThis
                                  ? "bg-emerald-500/40 text-black/70 cursor-not-allowed"
                                  : "bg-emerald-500/90 hover:bg-emerald-500 text-black cursor-pointer",
                              )}
                              onClick={() => onTakeOrder(o.orderId)}
                            >
                              {isTakingThis ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner />
                                  Taking…
                                </span>
                              ) : (
                                "Take"
                              )}
                            </button>
                          );
                        }

                        // 🟡 TAKEN
                        if (o.status === "TAKEN") {
                          if (isSeller) {
                            return (
                              <button
                                className="btn btn-primary py-1 px-3 text-xs"
                                onClick={() => {
                                  setTxidOrderId(o.orderId);
                                  setTxidOpen(true);
                                }}
                              >
                                Submit TXID
                              </button>
                            );
                          }

                          if (isBuyer) {
                            return (
                              <button
                                className="btn py-1 px-3 text-xs opacity-50 cursor-not-allowed"
                                disabled
                              >
                                Waiting Seller
                              </button>
                            );
                          }

                          return (
                            <button
                              className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs
                              bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                              disabled
                            >
                              Locked
                            </button>
                          );
                        }

                        // 🔵 DELIVERED
                        if (o.status === "DELIVERED") {
                          if (isBuyer) {
                            return (
                              <div>
                                <button
                                  className="btn btn-primary py-1 px-3 text-xs"
                                  onClick={() => {
                                    setConfirmOrderId(o.orderId);
                                    setConfirmOpen(true);
                                  }}
                                >
                                  Confirm
                                </button>
                                <button
                                  className="btn btn-danger py-1 px-3 ms-1 text-xs"
                                  onClick={() => {
                                    console.log("reject tx", o.orderId);
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            );
                          }

                          if (isSeller) {
                            return (
                              <button
                                className="btn py-1 px-3 text-xs opacity-50 cursor-not-allowed"
                                disabled
                              >
                                Waiting Confirmation
                              </button>
                            );
                          }

                          return (
                            <button
                              className="btn py-1 px-3 text-xs opacity-50 cursor-not-allowed"
                              disabled
                            >
                              Delivered
                            </button>
                          );
                        }

                        // ⚫ FINISHED
                        if (o.status === "FINISHED") {
                          return (
                            <button
                              className="btn py-1 px-3 text-xs opacity-50 cursor-not-allowed"
                              disabled
                            >
                              Completed
                            </button>
                          );
                        }

                        return null;
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ✅ Pagination footer (public only). If compact/private, you can hide it */}
      {compact == undefined && (
        <div className="px-2 py-3 flex items-center justify-between">
          <div className="text-xs text-white/50">
            Showing{" "}
            <span className="text-white/80 font-semibold">{orders.length}</span>{" "}
            orders
          </div>

          <button
            className={clsx(
              "rounded-xl px-3 py-1.5 text-xs font-medium border transition",
              nextCursor
                ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white"
                : "bg-white/5 border-white/10 text-white/40 cursor-not-allowed",
            )}
            disabled={!nextCursor || loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? "Loading…" : nextCursor ? "Load more" : "No more"}
          </button>
        </div>
      )}

      <SubmitTxIdDialog
        open={txidOpen}
        orderId={txidOrderId}
        onClose={() => {
          setTxidOpen(false);
          setTxidOrderId(null);
        }}
        onSubmit={async (txid) => {
          const order = orders.find((o) => o.orderId === txidOrderId);

          if (!order?.tradeId) {
            toast.error("Trade not initialized yet", { title: "Error" });
            return;
          }

          try {
            await submitDeliveryTx({
              chainId: order.chainId,
              tradeId: order.tradeId,
              txid,
            });

            toast.success("TXID submitted on-chain", { title: "Success" });
            await loadFirstPage();
          } catch (e: any) {
            toast.error(e.message || "Submit failed", { title: "Error" });
          }
        }}
      />

      <ConfirmReceiptDialog
        open={confirmOpen}
        orderId={confirmOrderId}
        tradeId={
          orders.find((o) => o.orderId === confirmOrderId)?.tradeId ?? null
        }
        txid={orders.find((o) => o.orderId === confirmOrderId)?.txId ?? null}
        confirming={
          confirmingId ===
          orders.find((o) => o.orderId === confirmOrderId)?.orderId
        }
        onClose={() => {
          if (confirmingId) return;
          setConfirmOpen(false);
          setConfirmOrderId(null);
        }}
        onConfirm={async () => {
          const confirmOrder = orders.find((o) => o.orderId === confirmOrderId);

          if (!isConnected || !address) {
            toast.error("Please connect your wallet first.", {
              title: "Wallet not connected",
            });
            return;
          }
          if (!confirmOrder) {
            toast.error("Order not found", { title: "Error" });
            return;
          }
          if (!confirmOrder.tradeId) {
            toast.error("tradeId is missing", { title: "Error" });
            return;
          }
          if (
            !confirmOrder.buyer ||
            confirmOrder.buyer.toLowerCase() !== address.toLowerCase()
          ) {
            toast.error("Only buyer can confirm receipt.", {
              title: "Not allowed",
            });
            return;
          }
          if (confirmOrder.status !== "DELIVERED") {
            toast.error("You can confirm only after seller submitted TXID.", {
              title: "Invalid status",
            });
            return;
          }

          try {
            setConfirmingId(confirmOrder.orderId);

            await confirmReceipt({
              chainId: confirmOrder.chainId,
              tradeId: confirmOrder.tradeId,
            });

            toast.success("Receipt confirmed. Trade finished.", {
              title: "Success",
            });
            setConfirmOpen(false);
            setConfirmOrderId(null);
            await loadFirstPage();
          } catch (e: any) {
            toast.error(`Failed to confirm: ${e?.message ?? "Unknown error"}`, {
              title: "Error",
            });
          } finally {
            setConfirmingId(null);
          }
        }}
      />
    </div>
  );
}
