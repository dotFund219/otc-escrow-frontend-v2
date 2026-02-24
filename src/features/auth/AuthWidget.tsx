import { useMemo, useState, useRef, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSiweAuth } from "./useSiweAuth";
import { isMetaMaskInstalled } from "./metamask";
import { useToast } from "../../components/ui/toast/ToastProvider";

function short(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "warn" | "neutral";
}) {
  const cls =
    tone === "good"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : tone === "warn"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : "border-white/10 bg-white/5 text-zinc-200/90";

  return (
    <span className={`pill ${cls} text-[11px] font-semibold`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

function WalletMenu({
  authed,
  address,
  onVerify,
  logout,
  disconnect,
  busy,
}: {
  authed: boolean;
  address?: string;
  onVerify: () => void;
  logout: () => void;
  disconnect: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const topTone = authed ? "good" : "warn";
  const topText = authed ? "Ready" : "Verify required";

  return (
    <div className="relative" ref={wrapRef}>
      {/* Trigger: account chip feel like an exchange */}
      <button
        type="button"
        className={`
    relative pill hover:bg-white/10 transition select-none
    ${!authed ? "border-amber-400/40 bg-amber-500/10" : ""}
  `}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="font-mono text-xs">{short(address)}</span>
        <span className="muted">▾</span>

        {/* ⚠ Warning badge */}
        {!authed && (
          <span
            className="
        absolute -top-1.5 -right-1.5
        w-4 h-4
        rounded-full
        bg-amber-400
        text-[10px]
        font-bold
        flex items-center justify-center
        text-black
        shadow-md
      "
            title="Verification required"
          >
            !
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 panel-inset shadow-panel z-50 overflow-hidden"
          role="menu"
        >
          {/* Header */}
          <div className="px-3 py-3 border-b border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {short(address)}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Trading access status
                </div>
              </div>
              <StatusPill label={topText} tone={topTone} />
            </div>
          </div>

          {/* Actions */}
          <div className="p-1">
            {/* Verify inside menu (sign in button removed instead) */}
            {!authed && (
              <button
                className={`w-full text-left px-3 py-2 rounded-lg transition
                  border border-emerald-400/25 bg-emerald-500/10 hover:bg-emerald-500/15
                  ${busy ? "opacity-60 cursor-not-allowed" : ""}
                `}
                disabled={busy}
                onClick={() => {
                  onVerify();
                  setOpen(false);
                }}
                role="menuitem"
              >
                <div className="text-sm font-semibold text-emerald-200">
                  {busy ? "Verifying..." : "Verify (SIWE)"}
                </div>
                <div className="text-xs text-zinc-400">
                  Enable trading actions & admin features
                </div>
              </button>
            )}

            {/* Sign out only when authed */}
            {authed && (
              <button
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                role="menuitem"
              >
                <div className="text-sm">Sign out (SIWE)</div>
                <div className="text-xs text-zinc-400">End session token</div>
              </button>
            )}

            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              role="menuitem"
            >
              <div className="text-sm">Disconnect wallet</div>
              <div className="text-xs text-zinc-400">Forget connector</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuthWidget() {
  const toast = useToast();

  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { authed, user, loading, login, logout } = useSiweAuth();

  const mmInstalled = useMemo(() => isMetaMaskInstalled(), []);

  const onConnect = async () => {
    if (!mmInstalled) {
      toast.error(
        "MetaMask not found. Please install MetaMask extension and try again.",
        { title: "Wallet not found" },
      );
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    try {
      await connect({ connector: connectors[0] });
      toast.success("Wallet connected", { title: "Connected" });
    } catch (e: any) {
      toast.error(
        e?.shortMessage || e?.message || "Failed to connect wallet.",
        {
          title: "Connect failed",
        },
      );
    }
  };

  const onVerify = async () => {
    try {
      await login();
      toast.success("SIWE verified", { title: "Verified" });
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to verify.", {
        title: "Verify failed",
      });
    }
  };

  const tierLabel = user?.kycTier ? `Tier ${user.kycTier}` : "Tier 1";

  return (
    <div className="flex items-center gap-2">
      <StatusPill label="Basic" tone="neutral" />
      <StatusPill label={tierLabel} tone="good" />

      {!isConnected ? (
        <button className="btn" onClick={onConnect} disabled={isPending}>
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <>
          {/* show status on the left (exchange feel even before opening menu) */}
          <StatusPill
            label={authed ? "Ready" : "Verify required"}
            tone={authed ? "good" : "warn"}
          />

          <WalletMenu
            authed={authed}
            address={address}
            onVerify={onVerify}
            logout={logout}
            disconnect={() => disconnect()}
            busy={loading}
          />
        </>
      )}
    </div>
  );
}
