import { useMemo, useState, useRef, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSiweAuth } from "./useSiweAuth";
import { isMetaMaskInstalled } from "./metamask";
import { useToast } from "../../components/ui/toast/ToastProvider";

function short(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function WalletMenu({
  authed,
  address,
  logout,
  disconnect,
}: {
  authed: boolean;
  address?: string;
  logout: () => void;
  disconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const dotClass = authed ? "bg-emerald-400" : "bg-amber-400";
  const statusText = authed ? "Signed in" : "Wallet connected";

  return (
    <div className="relative" ref={wrapRef}>
      {/* trigger */}
      <button
        type="button"
        className="pill hover:bg-white/10 transition select-none"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={`w-3 h-3 rounded-full ${dotClass}`} />
        <span>{short(address)}</span>
        <span className="muted">▾</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 panel-inset shadow-panel z-50 overflow-hidden"
          role="menu"
        >
          <div className="px-3 py-2 border-b border-white/10">
            <div className="text-sm">{short(address)}</div>
            <div className="text-xs text-zinc-400">{statusText}</div>
          </div>

          <div className="p-1">
            <button
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition ${
                !authed ? "opacity-40 cursor-not-allowed" : ""
              }`}
              disabled={!authed}
              onClick={() => {
                if (!authed) return;
                logout();
                setOpen(false);
              }}
              role="menuitem"
              title={!authed ? "Sign in first" : "Sign out of this app session"}
            >
              <div className="text-sm">Sign out</div>
              <div className="text-xs text-zinc-400">End SIWE session</div>
            </button>

            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              role="menuitem"
            >
              <div className="text-sm">Disconnect wallet</div>
              <div className="text-xs text-zinc-400">
                Reset wallet connection
              </div>
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
      toast.success("Successfully connected to MetaMask", {
        title: "Connected",
      });
    } catch (e: any) {
      toast.error(
        e?.shortMessage || e?.message || "Failed to connect wallet.",
        {
          title: "Connect failed",
        },
      );
    }
  };

  const onLogin = async () => {
    try {
      await login();
      toast.success("SIWE login successful", { title: "Signed in" });
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to sign in.", {
        title: "Sign-in failed",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="pill">
        <span className="muted">Basic</span>
      </span>

      <span className="pill border-emerald-400/30 bg-emerald-500/10">
        <span className="text-emerald-200">
          {user?.kycTier ? `Tier ${user.kycTier}` : "Tier 1"}
        </span>
      </span>

      {!isConnected ? (
        <button className="btn" onClick={onConnect} disabled={isPending}>
          {isPending ? "Connecting..." : "Connect"}
        </button>
      ) : (
        <>
          {/* Primary action stays visible */}
          {!authed && (
            <button
              className="btn btn-primary"
              onClick={onLogin}
              disabled={loading}
            >
              {loading ? "Signing..." : "Sign in"}
            </button>
          )}

          {/* Actions moved into menu */}
          <WalletMenu
            authed={authed}
            address={address}
            logout={logout}
            disconnect={() => disconnect()}
          />
        </>
      )}
    </div>
  );
}
