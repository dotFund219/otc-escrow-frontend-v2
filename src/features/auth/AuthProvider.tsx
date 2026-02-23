import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SiweMessage } from "siwe";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { getNonce, verifySiwe, type VerifyResponse } from "../../lib/api/auth";

type AuthState = {
  authed: boolean;
  token: string | null;
  user: VerifyResponse["user"] | null;
  loading: boolean;
  login: () => Promise<VerifyResponse>;
  logout: () => void;
  // if needed: you can also add refresh/revalidate here
};

export const AuthContext = createContext<AuthState | null>(null);

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  // ✅ localStorage is lazy init (prevents getItem from running on every render)
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("accessToken"),
  );

  const [user, setUser] = useState<VerifyResponse["user"] | null>(() =>
    safeJsonParse<VerifyResponse["user"]>(localStorage.getItem("user")),
  );

  const [loading, setLoading] = useState(false);

  const authed = useMemo(() => Boolean(token), [token]);

  const login = useCallback(async () => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    setLoading(true);
    try {
      const { nonce } = await getNonce(address);

      const msg = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to OTC Desk",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      });

      const message = msg.prepareMessage();
      const signature = await signMessageAsync({ message });

      const result = await verifySiwe(message, signature);

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

  // ✅ (optional) sync login/logout across other tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "accessToken") {
        setToken(e.newValue);
      }
      if (e.key === "user") {
        setUser(safeJsonParse(e.newValue));
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ authed, token, user, loading, login, logout }),
    [authed, token, user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
