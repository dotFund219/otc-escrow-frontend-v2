import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

function shortTxid(txid: string, left = 10, right = 10) {
  if (!txid) return "-";
  if (txid.length <= left + right) return txid;
  return `${txid.slice(0, left)}…${txid.slice(-right)}`;
}

export function RejectReceiptDialog(props: {
  open: boolean;
  orderId: string | null;
  tradeId: string | null;
  txid: string | null;

  onClose: () => void;
  onReject: () => Promise<void> | void;

  rejecting?: boolean;
}) {
  const { open, orderId, tradeId, txid, onClose, onReject, rejecting } = props;

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
  }, [open]);

  const missingTxid = useMemo(
    () => open && (!txid || !txid.trim()),
    [open, txid],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/55"
        onClick={() => !rejecting && onClose()}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="panel w-full max-w-lg p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-red-200">
                Reject Receipt
              </div>
              <div className="text-xs muted mt-1">
                Order&nbsp;
                <span className="font-mono text-zinc-200">
                  {orderId ?? "-"}
                </span>
                {tradeId ? (
                  <>
                    &nbsp;• Trade&nbsp;
                    <span className="font-mono text-zinc-200">{tradeId}</span>
                  </>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              className={clsx(
                "icon-btn w-9 h-9",
                rejecting && "opacity-60 cursor-not-allowed",
              )}
              disabled={!!rejecting}
              onClick={onClose}
              title="Close"
              aria-label="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="opacity-90"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="mt-4">
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-100">
              Are you sure you want to reject this delivery? This action will
              submit an on-chain transaction.
            </div>

            <div className="mt-4">
              <label className="text-xs muted">Seller TXID (for review)</label>

              <div
                className={clsx(
                  "panel-inset mt-2 p-3",
                  missingTxid && "border-red-400/25",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-xs break-all">
                    {txid?.trim() ? txid.trim() : "TXID not available"}
                  </div>

                  <button
                    type="button"
                    className={clsx(
                      "btn py-1 px-3 text-xs",
                      (missingTxid || rejecting) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    disabled={missingTxid || !!rejecting}
                    onClick={async () => {
                      if (!txid?.trim()) return;
                      try {
                        if (
                          navigator.clipboard?.writeText &&
                          window.isSecureContext
                        ) {
                          await navigator.clipboard.writeText(txid.trim());
                        } else {
                          const ta = document.createElement("textarea");
                          ta.value = txid.trim();
                          ta.setAttribute("readonly", "");
                          ta.style.position = "fixed";
                          ta.style.top = "-1000px";
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                        }
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      } catch {}
                    }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                {txid?.trim() ? (
                  <div className="mt-2 text-xs muted">
                    Preview:{" "}
                    <span className="font-mono text-zinc-200">
                      {shortTxid(txid.trim())}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className={clsx(
                  "btn py-2 px-3 text-xs",
                  rejecting && "opacity-60 cursor-not-allowed",
                )}
                disabled={!!rejecting}
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="button"
                className={clsx(
                  "btn btn-danger py-2 px-3 text-xs",
                  rejecting && "opacity-60 cursor-not-allowed",
                )}
                disabled={!!rejecting}
                onClick={async () => {
                  await onReject();
                }}
              >
                {rejecting ? "Rejecting..." : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
