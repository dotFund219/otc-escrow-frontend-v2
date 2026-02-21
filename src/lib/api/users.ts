export type MeResponse = {
  id: string;
  address: string;
  role?: string;
  kycTier?: string;
  createdAt: string;
};

function getBaseUrl() {
  return String(import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
}

export async function fetchMe(token: string): Promise<MeResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/users/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to load /users/me (${res.status})`);
  }

  return res.json();
}
