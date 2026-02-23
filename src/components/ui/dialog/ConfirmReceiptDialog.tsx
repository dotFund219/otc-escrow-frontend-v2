import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

function shortTxid(txid: string, left = 10, right = 10) {
  if (!txid) return "-";
  if (txid.length <= left + right) return txid;
  return `${txid.slice(0, left)}…${txid.slice(-right)}`;
}

// ✅ 추가: Clipboard API + fallback
async function safeCopy(text: string) {
  const value = text.trim();
  if (!value) return false;

  // 1) Modern Clipboard API (works on https / localhost)
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // ignore and fallback
  }

  // 2) Fallback: hidden textarea + execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);

    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ConfirmReceiptDialog(props: {
  open: boolean;
  orderId: string | null;
  tradeId: string | null;
  txid: string | null;

  onClose: () => void;
  onConfirm: () => Promise<void> | void;

  confirming?: boolean;
}) {
  const { open, orderId, tradeId, txid, onClose, onConfirm, confirming } =
    props;

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
  }, [open]);

  const missing = useMemo(() => open && (!txid || !txid.trim()), [open, txid]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/55"
        onClick={() => !confirming && onClose()}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="panel w-full max-w-lg p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Confirm Receipt</div>
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
                confirming && "opacity-60 cursor-not-allowed",
              )}
              disabled={!!confirming}
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
            <label className="text-xs muted">Seller TXID</label>

            <div
              className={clsx(
                "panel-inset mt-2 p-3",
                missing && "border-red-400/25",
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
                    missing && "opacity-50 cursor-not-allowed",
                  )}
                  disabled={missing}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (!txid?.trim()) return;

                    const ok = await safeCopy(txid);
                    if (ok) {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    } else {
                      // 실패 시 UX: 버튼 텍스트 대신, 원하면 toast로 바꿔도 됨
                      setCopied(false);
                      alert("Copy failed. Please copy manually.");
                    }
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

            {missing ? (
              <div className="mt-2 text-xs text-red-200">
                Seller has not submitted a TXID yet. You can’t confirm receipt.
              </div>
            ) : (
              <div className="mt-2 text-xs muted">
                Confirm only after you verified this TXID on the relevant
                explorer.
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className={clsx(
                  "btn py-2 px-3 text-xs",
                  confirming && "opacity-60 cursor-not-allowed",
                )}
                disabled={!!confirming}
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="button"
                className={clsx(
                  "btn btn-primary py-2 px-3 text-xs",
                  (missing || confirming) && "opacity-60 cursor-not-allowed",
                )}
                disabled={missing || !!confirming}
                onClick={async () => {
                  await onConfirm();
                }}
              >
                {confirming ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
