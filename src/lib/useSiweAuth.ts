import { useCallback, useMemo, useState } from "react";
import { SiweMessage } from "siwe";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { getNonce, verifySiwe, type VerifyResponse } from "./api";

export function useSiweAuth() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const [token, setToken] = useState<string | null>(localStorage.getItem("accessToken"));
  const [user, setUser] = useState<VerifyResponse["user"] | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const authed = useMemo(() => Boolean(token), [token]);

  const login = useCallback(async () => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    setLoading(true);
    try {
      // 1) nonce
      const { nonce } = await getNonce(address);

      // 2) SIWE message
      const domain = import.meta.env.VITE_APP_DOMAIN || window.location.host;
      const uri = import.meta.env.VITE_APP_URI || window.location.origin;

      const msg = new SiweMessage({
        domain,
        address,
        statement: "Sign in to OTC Desk",
        uri,
        version: "1",
        chainId,
        nonce,
      });

      const message = msg.prepareMessage();

      // 3) Sign
      const signature = await signMessageAsync({ message });

      // 4) Verify
      const result = await verifySiwe(message, signature);

      // 5) Store token
      setToken(result.accessToken);
      setUser(result.user);

      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("user", JSON.stringify(result.user));

      return result;
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, chainId, signMessageAsync]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  }, []);

  return { authed, token, user, loading, login, logout };
}
