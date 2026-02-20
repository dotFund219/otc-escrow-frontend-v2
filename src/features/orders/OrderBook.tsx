import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import {
  fetchPublicOrderBook,
  type OrderStatus,
  type OtcOrder,
} from "../../lib/api/orders";
import { formatPrice, formatUnits, getTokenMeta } from "../../lib/tokenMeta";
import { IconRefreshButton } from "../../components/ui/button/IconRefreshButton";
import { ABI, ADDR, ERC20_ABI } from "../../lib/contract";
import { useAccount, useReadContract } from "wagmi";
import { useToast } from "../../components/ui/toast/ToastProvider";
import { approveAndTakeOrder } from "../../lib/web3/takeOrder";
import { SubmitTxIdDialog } from "../../components/ui/dialog/SubmitTxIdDialog";
import { submitDeliveryTx } from "../../lib/web3/submitDeliveryTx";
import { ConfirmReceiptDialog } from "../../components/ui/dialog/ConfirmReceiptDialog";
import { confirmReceipt } from "../../lib/web3/confirmReceipt";

function shortAddr(a?: string | null, left = 6, right = 4) {
  if (!a) return "-";
  if (a.length <= left + right) return a;
  return `${a.slice(0, left)}…${a.slice(-right)}`;
}

export function OrderBook({ compact }: { compact?: boolean }) {
  const toast = useToast();

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
      // 메타 실패는 치명적 아님
      console.warn("token meta load failed", e);
    }
  }

  // ✅ 첫 페이지 로드 (refresh)
  const loadFirstPage = async () => {
    setLoading(true);
    setErr(null);

    try {
      const data = await fetchPublicOrderBook({ chainId, limit });
      const list = data.orders ?? [];
      setOrders(list);
      setNextCursor(data.nextCursor ?? null);
      setHasLoadedMore(false);

      await loadTokenMeta(list);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load orderbook");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 다음 페이지 로드 (append)
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
        // 중복 제거 (orderId 기준)
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

  // ✅ auto refresh: “첫 페이지”만 안전하게 갱신
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
  }, [chainId, hasLoadedMore]);

  useEffect(() => {
    if (countdown !== REFRESH_SEC) return;

    // countdown이 1에서 5로 리셋되는 타이밍이므로,
    // 여기서 refresh 실행시키면 정확히 5초 주기됨.
    // 단, 첫 렌더의 초기 5도 여기 들어오므로 보호.
    if (refreshingRef.current) return;

    // 최초 진입 보호: orders가 비어있고 loading이면 스킵
    // (필요없으면 제거해도 됨)
    if (loading) return;

    refreshingRef.current = true;
    Promise.resolve()
      .then(async () => {
        if (hasLoadedMore) {
          // 기존 로직: 상단 페이지만 갱신 + 아래는 유지
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
  }, [countdown]);

  const onTakeOrder = (orderId: string) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first.", {
        title: "Wallet not connected",
      });
      return;
    }

    const sellToken = orders.find((o) => o.orderId === orderId)?.sellToken;
    if (!sellToken) {
      toast.error("Order not found", { title: "Error" });
      return;
    }

    approveAndTakeOrder({
      orderId,
      chainId,
      contract: ADDR.contracts.orders,
      quoteToken: orders.find((o) => o.orderId === orderId)?.quoteToken ?? "",
      quoteAmount:
        orders.find((o) => o.orderId === orderId)?.quoteAmount ?? "0",
    })
      .then((result) => {
        toast.success("Order taken successfully", { title: "Success" });
      })
      .catch((e) => {
        toast.error("Failed to take order: " + e.message, { title: "Error" });
      });
  };

  const onSubmitTxId = (orderId: string) => {};

  return (
    <div
      className={clsx("panel p-6", compact && "p-0 bg-transparent shadow-none")}
    >
      {loading && orders.length === 0 && (
        <div className="border-t border-white/10 px-4 py-6 text-sm muted">
          Loading order book...
        </div>
      )}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Order Book</div>

          <div className="flex items-center gap-3">
            <div className="pill text-xs">
              Auto refresh in{" "}
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
        <div className="overflow-hidden rounded-xl border border-white/10">
          {/* ✅ STATUS 컬럼 포함: grid-cols-7 */}
          <div className="grid grid-cols-7 bg-white/5 text-xs muted px-4 py-2">
            <div>TYPE</div>
            <div>PAIR</div>
            <div>QUANTITY</div>
            <div>PRICE</div>
            <div>TOTAL</div>
            <div>STATUS</div>
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

            const qtyHuman = formatUnits(o.sellAmount, sellMeta.decimals, 6);
            const totalHuman = formatUnits(
              o.quoteAmount,
              quoteMeta.decimals,
              2,
            );

            const priceHuman = formatPrice(
              o.quoteAmount,
              quoteMeta.decimals,
              o.sellAmount,
              sellMeta.decimals,
              6,
            );

            const pair = `${sellMeta.symbol}/${quoteMeta.symbol}`;

            const STATUS_STYLE: Record<OrderStatus, string> = {
              OPEN: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",

              TAKEN: "bg-yellow-500/15 text-yellow-300 border-yellow-400/20",

              DELIVERED: "bg-blue-500/15 text-blue-300 border-blue-400/20",

              FINISHED: "bg-purple-500/15 text-purple-300 border-purple-400/20",

              CANCELLED: "bg-zinc-500/15 text-zinc-300 border-zinc-400/20",
            };

            return (
              <div
                key={`${o.chainId}:${o.orderId}`}
                className="grid grid-cols-7 px-4 py-3 text-sm border-t border-white/10"
              >
                <div>
                  <span className="pill px-2 py-0.5 bg-red-500/15 border-red-400/20 text-red-200">
                    SELL
                  </span>
                </div>

                <div className="font-semibold">{pair}</div>

                <div>
                  {qtyHuman} {sellMeta.symbol}
                </div>

                <div>
                  {priceHuman} {quoteMeta.symbol}
                </div>

                <div>
                  {totalHuman} {quoteMeta.symbol}
                </div>

                <div>
                  <span
                    className={clsx("pill px-2 py-0.5", STATUS_STYLE[o.status])}
                  >
                    {o.status}
                  </span>
                </div>

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
                      if (!isConnected) {
                        return (
                          <button
                            className="btn py-1 px-3 text-xs"
                            onClick={() => toast.error("Connect wallet first")}
                          >
                            Connect
                          </button>
                        );
                      }

                      if (isSeller) {
                        return (
                          <button
                            className="btn py-1 px-3 text-xs opacity-50 cursor-not-allowed"
                            disabled
                          >
                            Your Order
                          </button>
                        );
                      }

                      return (
                        <button
                          className="btn btn-primary py-1 px-3 text-xs"
                          onClick={() => onTakeOrder(o.orderId)}
                        >
                          Take
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
                          className="btn py-1 px-3 text-xs opacity-50 cursor-not-allowed"
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

        {/* ✅ Pagination footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs muted">
            Showing {orders.length} {orders.length === 1 ? "order" : "orders"}
          </div>

          <div className="flex items-center gap-2">
            <button
              className={clsx(
                "btn py-1 px-3 text-xs",
                !nextCursor && "opacity-50 cursor-not-allowed",
              )}
              disabled={!nextCursor || loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? "Loading…" : nextCursor ? "Load more" : "No more"}
            </button>
          </div>
        </div>
      </div>
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
        txid={orders.find((o) => o.orderId === confirmOrderId)?.txid ?? null}
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
          // if (!confirmTxid || !String(confirmTxid).trim()) {
          //   toast.error("TXID not available.", { title: "Cannot confirm" });
          //   return;
          // }

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
