import { useEffect, useState } from "react";
import type { MeResponse } from "../lib/api/users";
import { fetchMe } from "../lib/api/users";

export function useMe(token?: string) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setMe(null);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMe(token);
        if (!cancelled) setMe(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load user");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return { me, loading, error };
}
