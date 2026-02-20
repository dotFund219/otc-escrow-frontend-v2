import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

function isValidTxid(v: string) {
  const s = v.trim();
  // EVM tx hash (0x + 64 hex)
  if (/^0x[a-fA-F0-9]{64}$/.test(s)) return true;
  // Non-EVM txid도 고려하면 길이만 체크 (원하면 더 엄격하게)
  if (s.length >= 16 && s.length <= 128) return true;
  return false;
}

export function SubmitTxIdDialog(props: {
  open: boolean;
  orderId: string | null;
  chainId?: number;
  initialTxid?: string;
  onClose: () => void;
  onSubmit: (txid: string) => Promise<void> | void;
}) {
  const { open, orderId, onClose, onSubmit } = props;

  const [txid, setTxid] = useState(props.initialTxid ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTxid(props.initialTxid ?? "");
      setSubmitting(false);
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  const error = useMemo(() => {
    if (!touched) return "";
    if (!txid.trim()) return "TXID is required.";
    if (!isValidTxid(txid)) return "TXID format looks invalid.";
    return "";
  }, [txid, touched]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/55"
        onClick={() => !submitting && onClose()}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="panel w-full max-w-lg p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Submit Delivery TXID</div>
              <div className="text-xs muted mt-1">
                Order&nbsp;
                <span className="font-mono text-zinc-200">
                  {orderId ?? "-"}
                </span>
              </div>
            </div>

            <button
              className={clsx(
                "icon-btn w-9 h-9",
                submitting && "opacity-60 cursor-not-allowed",
              )}
              disabled={submitting}
              onClick={onClose}
              title="Close"
              aria-label="Close"
            >
              {/* X icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
            <label className="text-xs muted">TXID</label>
            <input
              className={clsx(
                "input mt-2 font-mono text-sm",
                error && "border-red-400/30",
              )}
              placeholder="0x… (transaction hash)"
              value={txid}
              onChange={(e) => setTxid(e.target.value)}
              onBlur={() => setTouched(true)}
              autoFocus
              disabled={submitting}
            />
            {error && <div className="mt-2 text-xs text-red-200">{error}</div>}

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs muted">
                Paste the transfer transaction id you broadcasted.
              </div>

              <div className="flex items-center gap-2">
                <button
                  className={clsx(
                    "btn py-2 px-3 text-xs",
                    submitting && "opacity-60 cursor-not-allowed",
                  )}
                  disabled={submitting}
                  onClick={onClose}
                >
                  Cancel
                </button>

                <button
                  className={clsx(
                    "btn btn-primary py-2 px-3 text-xs",
                    (!!error || !txid.trim() || submitting) &&
                      "opacity-60 cursor-not-allowed",
                  )}
                  disabled={!!error || !txid.trim() || submitting}
                  onClick={async () => {
                    setTouched(true);
                    if (!txid.trim() || !isValidTxid(txid)) return;

                    try {
                      setSubmitting(true);
                      await onSubmit(txid.trim());
                      onClose();
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
