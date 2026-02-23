import { useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cx } from "../../lib/uifunctions";
import { uploadKycImage } from "../../lib/api/kyc";
import { useSiweAuth } from "../auth/useSiweAuth";
import type { MeResponse } from "../../lib/api/users";

function fmtDate(d?: string) {
  if (!d) return "Unknown";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "Unknown";
  }
}

export function ProfilePanel({ me }: { me?: MeResponse }) {
  const [kycOpen, setKycOpen] = useState(false);

  const approved = me?.kycTier === "2";

  const KYC_STYLE: Record<
    "NOT_APPROVED" | "PENDING" | "APPROVED" | "REJECTED",
    string
  > = {
    NOT_APPROVED: "border-zinc-400/20 bg-zinc-500/10 text-zinc-300",
    PENDING: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    APPROVED: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    REJECTED: "border-red-400/30 bg-red-500/10 text-red-200",
  };

  const KYC_DOT: Record<
    "NOT_APPROVED" | "PENDING" | "APPROVED" | "REJECTED",
    string
  > = {
    NOT_APPROVED: "bg-zinc-400/70",
    PENDING: "bg-amber-400/80",
    APPROVED: "bg-emerald-400/80",
    REJECTED: "bg-red-400/80",
  };

  const rawStatus = me?.kyc?.status as
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | undefined;

  const kycStatus = rawStatus ?? "NOT_APPROVED";

  return (
    <>
      <div className="panel p-6 relative overflow-hidden">
        <div className="flex items-start justify-between gap-6">
          {/* LEFT */}
          <div>
            <div className="text-lg font-semibold tracking-tight">Profile</div>
            <div className="mt-1 text-xs text-zinc-400">
              Account overview & compliance
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* KYC Status Badge */}
            <span
              className={cx(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium border",
                me?.kycTier === "2"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-400/30 bg-red-500/10 text-red-300",
              )}
            >
              <span
                className={cx(
                  "h-1.5 w-1.5 rounded-full",
                  me?.kycTier === "2" ? "bg-emerald-400" : "bg-red-400",
                )}
              />
              {me?.kycTier === "2" ? "Verified" : "KYC Required"}
            </span>

            {/* Upload Icon Button */}
            <button
              onClick={() => setKycOpen(true)}
              title="Upload KYC"
              className={cx(
                "flex items-center justify-center",
                "h-9 w-9 rounded-lg border transition",
                me?.kycTier === "2"
                  ? "border-zinc-600 text-zinc-400 hover:bg-zinc-800"
                  : "border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10",
              )}
            >
              <Upload size={18} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm">
          <div className="panel-inset p-4">
            <div className="grid gap-2">
              <Row label="Role" value={me?.role || "TRADER"} />
              <Row
                label="KYC Status"
                value={
                  <span
                    className={cx(
                      "inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1 text-[11px] font-semibold border",
                      KYC_STYLE[kycStatus],
                    )}
                  >
                    <span
                      className={cx(
                        "h-1.5 w-1.5 rounded-full",
                        KYC_DOT[kycStatus],
                      )}
                    />
                    {kycStatus === "NOT_APPROVED" ? "NOT APPROVED" : kycStatus}
                  </span>
                }
              />
              <Row label="Member Since" value={fmtDate(me?.createdAt)} />
            </div>
          </div>

          {/* optional: compliance hint bar */}
          {!approved && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100/90">
              <div className="font-semibold">Action required</div>
              <div className="mt-1 text-xs text-amber-100/70">
                Upload a clear photo of your ID (and any required document) to
                enable higher limits.
              </div>
            </div>
          )}
        </div>
      </div>

      <KycUploadDialog open={kycOpen} onClose={() => setKycOpen(false)} />
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-100">{value}</span>
    </div>
  );
}

function KycUploadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { token } = useSiweAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  // cleanup object URL
  useMemo(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function upload() {
    if (!file) {
      setErr("Please select an image first.");
      return;
    }
    setErr("");
    setBusy(true);

    try {
      // token isn't available on ProfilePanel,
      // your project provides token via useSiweAuth, so
      // either pass token into ProfilePanel as a prop,
      // or let the dialog call useSiweAuth directly.
      await uploadKycImage({ file, token: token ?? null });

      onClose();
      setFile(null);
    } catch (e: any) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* scrim */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => !busy && onClose()}
      />

      {/* dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="panel w-full max-w-lg p-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold tracking-tight">
                Upload KYC Image
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                JPG/PNG recommended. Make sure the text is readable.
              </div>
            </div>

            <button
              className="btn px-3 py-2 text-sm"
              onClick={() => !busy && onClose()}
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="panel-inset p-4">
              <div className="flex flex-col gap-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    setErr("");
                  }}
                />

                <div className="flex items-center gap-2">
                  <button
                    className="btn"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                  >
                    Choose file
                  </button>

                  <div className="text-xs text-zinc-400 truncate">
                    {file ? file.name : "No file selected"}
                  </div>

                  {file && (
                    <button
                      className="btn btn-danger ml-auto"
                      onClick={() => !busy && setFile(null)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* preview */}
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  {file ? (
                    <div className="grid gap-2">
                      <img
                        src={previewUrl}
                        alt="KYC preview"
                        className="w-full max-h-64 object-contain rounded-xl border border-white/10"
                      />
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>{file.type || "image"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-400">
                      Select an image to preview it here.
                    </div>
                  )}
                </div>

                {err && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {err}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button className="btn" onClick={() => !busy && onClose()}>
                Cancel
              </button>
              <button
                className={cx("btn btn-primary", busy && "opacity-80")}
                onClick={upload}
                disabled={busy}
              >
                {busy ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
