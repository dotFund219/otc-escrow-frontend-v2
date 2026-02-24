import { useEffect, useMemo, useState, useRef } from "react";
import { useToast } from "../../../components/ui/toast/ToastProvider";
import { Dialog } from "../../../components/ui/dialog/Dialog";
import {
  fetchPublicOrderBook,
  type OtcOrder,
  type OrderStatus,
} from "../../../lib/api/orders";

import {
  chainAdminForceRefund,
  chainAdminForceRelease,
} from "../../../lib/web3/admin";

type Filters = {
  chainId?: number;
  sellToken?: string;
  quoteToken?: string;
  status?: OrderStatus | "ALL";
  q?: string; // search: seller/buyer/orderId/txHash
};

function shortAddr(a?: string | null) {
  if (!a) return "-";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function statusPill(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-emerald-500/12 border-emerald-400/20 text-emerald-200";
    case "TAKEN":
      return "bg-yellow-500/12 border-yellow-400/20 text-yellow-200";
    case "DELIVERED":
      return "bg-sky-500/12 border-sky-400/20 text-sky-200";
    case "FINISHED":
      return "bg-violet-500/12 border-violet-400/20 text-violet-200";
    case "REJECTED":
      return "bg-red-500/12 border-red-400/20 text-red-200";
    case "CANCELLED":
      return "bg-zinc-500/10 border-white/10 text-zinc-200/80";
    default:
      return "bg-zinc-500/10 border-white/10 text-zinc-200/80";
  }
}

function tokenSym(addrOrSym?: string | null) {
  if (!addrOrSym) return "-";
  // your project may have tokenMeta for addr->symbol mapping; swap later if needed
  // if value is symbol show it, if address show first 6 chars…
  if (addrOrSym.startsWith("0x")) return shortAddr(addrOrSym);
  return addrOrSym;
}

function safeDate(ts?: string | null) {
  if (!ts) return "-";
  // createdAt may be bigint string (seconds) or ISO; handle both
  // 1) if numeric assume seconds
  if (/^\d+$/.test(ts)) {
    const n = Number(ts);
    if (!Number.isFinite(n)) return ts;
    const ms = n > 10_000_000_000 ? n : n * 1000;
    return new Date(ms).toLocaleString();
  }
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function formatAmount(raw?: string | null) {
  if (!raw) return "-";
  // backend returns numeric(65,0) as string
  // don't know decimals so just show raw + truncate if long
  if (raw.length > 18) return `${raw.slice(0, 6)}…${raw.slice(-6)}`;
  return raw;
}

export function AdminOrdersPanel() {
  const toast = useToast();

  const [filters, setFilters] = useState<Filters>({
    chainId: undefined,
    sellToken: "",
    quoteToken: "",
    status: "ALL",
    q: "",
  });

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OtcOrder[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<OtcOrder | null>(null);

  const [forceBusy, setForceBusy] = useState<"release" | "refund" | null>(null);

  const didMountRef = useRef(false);

  async function runForce(kind: "release" | "refund", order: OtcOrder) {
    if (!order.tradeId) {
      toast.error("No tradeId; cannot perform force action.");
      return;
    }

    // order.tradeId is a string (big number), convert to bigint
    let tid: bigint;
    try {
      tid = BigInt(order.tradeId);
    } catch {
      toast.error("tradeId format is invalid.");
      return;
    }

    setForceBusy(kind);
    try {
      const txHash =
        kind === "release"
          ? await chainAdminForceRelease(tid)
          : await chainAdminForceRefund(tid);

      console.log(txHash);
      toast.success("Transaction submitted", {
        title: kind === "release" ? "Force Release" : "Force Refund",
      });

      // optional: you could wait for receipt here using wagmi waitForTransactionReceipt
      // await waitForTransactionReceipt(wagmiConfig, { hash: txHash })

      // refresh the UI
      await load(true);
      setSelected(null);
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Force action failed");
    } finally {
      setForceBusy(null);
    }
  }

  async function load(reset = false) {
    setLoading(true);
    try {
      const res = await fetchPublicOrderBook({
        chainId: filters.chainId,
        sellToken: filters.sellToken?.trim() || undefined,
        quoteToken: filters.quoteToken?.trim() || undefined,
        limit: 25,
        cursor: reset ? undefined : cursor || undefined,
      });

      const merged = reset ? res.orders : [...orders, ...res.orders];

      // apply additional status/search filters on the frontend (public endpoint doesn’t support status filtering)
      const filtered = applyClientFilters(merged, filters);

      setOrders(filtered);
      setNextCursor(res.nextCursor ?? null);

      if (reset) setCursor(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  function applyClientFilters(list: OtcOrder[], f: Filters) {
    let out = list;

    // status filter
    if (f.status && f.status !== "ALL") {
      out = out.filter((o) => o.status === f.status);
    }

    // search filter
    const q = (f.q || "").trim().toLowerCase();
    if (q) {
      out = out.filter((o) => {
        return (
          o.orderId?.toLowerCase().includes(q) ||
          o.seller?.toLowerCase().includes(q) ||
          (o.buyer || "").toLowerCase().includes(q) ||
          (o.lastTxHash || "").toLowerCase().includes(q) ||
          (o.txId || "").toLowerCase().includes(q)
        );
      });
    }

    return out;
  }

  useEffect(() => {
    // initial load
    load(true);
    didMountRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when filters change, refresh
  useEffect(() => {
    if (!didMountRef.current) return;

    // add a very short debounce effect
    const t = window.setTimeout(() => load(true), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.chainId,
    filters.sellToken,
    filters.quoteToken,
    filters.status,
    filters.q,
  ]);

  const rows = useMemo(() => orders, [orders]);

  return (
    <div className="panel-inset p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Orders</div>
          <div className="text-sm muted">
            Public order book ({orders.length}) + admin search & monitor
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn"
            onClick={() => {
              load(true);
              toast.success("Orders refreshed", { title: "OK" });
            }}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="btn"
            onClick={() => {
              if (!nextCursor) return;
              setCursor(nextCursor);
              // load after updating the cursor
              setTimeout(() => load(false), 0);
            }}
            disabled={loading || !nextCursor}
          >
            Load more
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-2">
          <div className="text-xs muted mb-1">Chain</div>
          <select
            className="input"
            value={filters.chainId ?? ""}
            onChange={(e) =>
              setFilters((p) => ({
                ...p,
                chainId: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          >
            <option value="">All</option>
            <option value="56">BSC</option>
            <option value="97">BSC Testnet</option>
          </select>
        </div>

        <div className="col-span-6 md:col-span-2">
          <div className="text-xs muted mb-1">Sell Token</div>
          <input
            className="input"
            placeholder="WBTC / 0x…"
            value={filters.sellToken || ""}
            onChange={(e) =>
              setFilters((p) => ({ ...p, sellToken: e.target.value }))
            }
          />
        </div>

        <div className="col-span-6 md:col-span-2">
          <div className="text-xs muted mb-1">Quote Token</div>
          <input
            className="input"
            placeholder="USDT / 0x…"
            value={filters.quoteToken || ""}
            onChange={(e) =>
              setFilters((p) => ({ ...p, quoteToken: e.target.value }))
            }
          />
        </div>

        <div className="col-span-6 md:col-span-2">
          <div className="text-xs muted mb-1">Status</div>
          <select
            className="input"
            value={filters.status || "ALL"}
            onChange={(e) =>
              setFilters((p) => ({ ...p, status: e.target.value as any }))
            }
          >
            <option value="ALL">All</option>
            <option value="OPEN">OPEN</option>
            <option value="TAKEN">TAKEN</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="FINISHED">FINISHED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="col-span-12 md:col-span-4">
          <div className="text-xs muted mb-1">Search</div>
          <input
            className="input"
            placeholder="orderId / seller / buyer / txHash / txId"
            value={filters.q || ""}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-auto rounded-xl border border-white/10 bg-black/10">
        <table className="w-full text-sm">
          <thead className="muted sticky top-0 bg-black/30 backdrop-blur">
            <tr className="text-left">
              <th className="py-3 px-3">Order</th>
              <th className="px-3">Pair</th>
              <th className="px-3">Seller</th>
              <th className="px-3">Buyer</th>
              <th className="px-3">Amounts</th>
              <th className="px-3">Status</th>
              <th className="px-3">Updated</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((o) => (
              <tr
                key={`${o.chainId}-${o.orderId}`}
                className="border-t border-white/10 hover:bg-white/[0.03] transition"
              >
                <td className="py-3 px-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs">
                      #{o.orderId}
                      <span className="muted ml-2">({o.chainId})</span>
                    </div>
                    <div className="text-[11px] muted mt-0.5">
                      Created {safeDate(o.createdAt)}
                    </div>
                  </div>
                </td>

                <td className="px-3">
                  <div className="text-xs font-semibold">
                    {tokenSym(o.sellToken)}/{tokenSym(o.quoteToken)}
                  </div>
                  <div className="text-[11px] muted mt-0.5 truncate max-w-[220px]">
                    {shortAddr(o.contract)}
                  </div>
                </td>

                <td className="px-3">
                  <div className="font-mono text-xs">{shortAddr(o.seller)}</div>
                </td>

                <td className="px-3">
                  <div className="font-mono text-xs">{shortAddr(o.buyer)}</div>
                </td>

                <td className="px-3">
                  <div className="text-xs">
                    <span className="muted">Sell</span>{" "}
                    <span className="font-mono">
                      {formatAmount(o.sellAmount)}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5">
                    <span className="muted">Quote</span>{" "}
                    <span className="font-mono">
                      {formatAmount(o.quoteAmount)}
                    </span>
                  </div>
                </td>

                <td className="px-3">
                  <span
                    className={`
                      inline-flex items-center gap-2
                      rounded-full px-3 py-1 text-[11px]
                      font-semibold border
                      ${statusPill(o.status)}
                    `}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                    {o.status}
                  </span>
                </td>

                <td className="px-3">
                  <div className="text-xs muted">
                    block {o.updatedBlock || "-"}
                  </div>
                  <div className="text-[11px] muted mt-0.5 truncate max-w-[200px]">
                    {o.lastTxHash ? shortAddr(o.lastTxHash) : "-"}
                  </div>
                </td>

                <td className="py-3 px-3 text-right">
                  <button className="btn" onClick={() => setSelected(o)}>
                    Details
                  </button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center muted">
                  No orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer meta */}
      <div className="mt-3 flex items-center justify-between text-xs muted">
        <div>
          Showing <span className="text-zinc-200/90">{rows.length}</span> orders
        </div>
        <div className="flex items-center gap-2">
          <span className="pill text-[11px]">
            nextCursor: {nextCursor ? `${nextCursor.slice(0, 6)}…` : "none"}
          </span>
        </div>
      </div>

      {/* Details dialog */}
      {selected && (
        <Dialog
          open
          onClose={() => setSelected(null)}
          title={
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold">Order #{selected.orderId}</div>
                <div className="text-sm muted mt-1">
                  {tokenSym(selected.sellToken)}/{tokenSym(selected.quoteToken)}{" "}
                  • chain {selected.chainId}
                </div>
              </div>
              <span
                className={`
                  inline-flex items-center gap-2 rounded-full px-3 py-1
                  text-[11px] font-semibold border
                  ${statusPill(selected.status)}
                `}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                {selected.status}
              </span>
            </div>
          }
          size="lg"
          footer={
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs muted">
                {selected.status === "REJECTED"
                  ? "Dispute pending: Admin can force release/refund."
                  : " "}
              </div>

              <div className="flex items-center gap-2">
                {/* ✅ only when REJECTED and tradeId exists */}
                {selected.status === "REJECTED" && selected.tradeId && (
                  <>
                    <button
                      className="btn btn-primary"
                      disabled={!!forceBusy}
                      onClick={() => runForce("release", selected)}
                      title="Release quote to seller (+ fee to treasury if any)"
                    >
                      {forceBusy === "release" ? "Releasing…" : "Force Release"}
                    </button>

                    <button
                      className="btn btn-danger"
                      disabled={!!forceBusy}
                      onClick={() => runForce("refund", selected)}
                      title="Refund quote back to buyer (quote + fee)"
                    >
                      {forceBusy === "refund" ? "Refunding…" : "Force Refund"}
                    </button>
                  </>
                )}

                {selected.lastTxHash && (
                  <button
                    className="btn"
                    onClick={() => {
                      navigator.clipboard.writeText(selected.lastTxHash!);
                      toast.success("Copied tx hash");
                    }}
                  >
                    Copy txHash
                  </button>
                )}

                <button
                  className="btn"
                  onClick={() => {
                    navigator.clipboard.writeText(selected.orderId);
                    toast.success("Copied orderId");
                  }}
                >
                  Copy orderId
                </button>

                <button className="btn" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7">
              <div className="panel-inset p-4 space-y-3">
                <div className="text-xs muted">Addresses</div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] muted">Seller</div>
                    <div className="font-mono text-xs mt-1 break-all">
                      {selected.seller}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] muted">Buyer</div>
                    <div className="font-mono text-xs mt-1 break-all">
                      {selected.buyer || "-"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                  <div>
                    <div className="text-[11px] muted">Contract</div>
                    <div className="font-mono text-xs mt-1 break-all">
                      {selected.contract}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] muted">Trade ID</div>
                    <div className="font-mono text-xs mt-1 break-all">
                      {selected.tradeId || "-"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                  <div>
                    <div className="text-[11px] muted">Created</div>
                    <div className="text-sm mt-1">
                      {safeDate(selected.createdAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] muted">Blocks</div>
                    <div className="text-sm mt-1">
                      {selected.createdBlock || "-"} →{" "}
                      {selected.updatedBlock || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5">
              <div className="panel-inset p-4 space-y-3">
                <div className="text-xs muted">Amounts</div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[11px] muted">Sell</div>
                  <div className="mt-1 font-mono text-sm break-all">
                    {selected.sellAmount}
                  </div>
                  <div className="text-[11px] muted mt-1">
                    {tokenSym(selected.sellToken)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[11px] muted">Quote</div>
                  <div className="mt-1 font-mono text-sm break-all">
                    {selected.quoteAmount}
                  </div>
                  <div className="text-[11px] muted mt-1">
                    {tokenSym(selected.quoteToken)}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="text-[11px] muted">Last Tx Hash</div>
                  <div className="font-mono text-xs mt-1 break-all">
                    {selected.lastTxHash || "-"}
                  </div>

                  <div className="text-[11px] muted mt-3">
                    Delivery TXID (txId)
                  </div>
                  <div className="font-mono text-xs mt-1 break-all">
                    {selected.txId || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
