const API_BASE = import.meta.env.VITE_API_BASE;

export type VerifyResponse = {
  user: { id: number; walletAddress: string; kycTier: number };
  accessToken: string;
};

export async function getNonce(address: string) {
  const url = new URL(`${API_BASE}/auth/siwe/nonce`);
  url.searchParams.set("address", address);
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to get nonce");
  return res.json() as Promise<{ nonce: string; expiresAt: string }>;
}

export async function verifySiwe(message: string, signature: `0x${string}`) {
  const res = await fetch(`${API_BASE}/auth/siwe/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, signature }),
  });
  if (!res.ok) throw new Error("SIWE verify failed");
  return res.json() as Promise<VerifyResponse>;
}
