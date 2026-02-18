import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSiweAuth } from "./useSiweAuth";

function short(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export function AuthWidget() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { authed, user, loading, login, logout } = useSiweAuth();

  return (
    <div className="flex items-center gap-2">
      <span className="pill">
        <span className="muted">Basic</span>
      </span>
      <span className="pill border-emerald-400/30 bg-emerald-500/10">
        <span className="text-emerald-200">{user?.kycTier ? `Tier ${user.kycTier}` : "Tier 1"}</span>
      </span>

      {!isConnected ? (
        <button className="btn" onClick={() => connect({ connector: connectors[0] })} disabled={isPending}>
          Connect
        </button>
      ) : (
        <>
          {!authed ? (
            <button className="btn btn-primary" onClick={() => login()} disabled={loading}>
              {loading ? "Signing..." : "Sign in"}
            </button>
          ) : (
            <button className="btn" onClick={logout}>Sign out</button>
          )}

          <span className="pill">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span>{short(address)}</span>
          </span>

          <button className="btn" onClick={() => disconnect()}>
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}
