const API_BASE = import.meta.env.VITE_API_BASE;

export type OrderStatus =
  | "OPEN"
  | "CANCELLED"
  | "TAKEN"
  | "DELIVERED"
  | "FINISHED";

export interface OtcOrder {
  orderId: string;
  chainId: number;
  contract: string;
  seller: string;
  sellToken: string;
  sellAmount: string;
  quoteToken: string;
  quoteAmount: string;
  status: OrderStatus;
  buyer: string | null;
  tradeId: string | null;
  txId: string | null;
  createdAt: string | null;
  createdBlock: string | null;
  updatedBlock: string | null;
  lastTxHash: string | null;
}

export interface OrdersResponse {
  ok: boolean;
  seller: string;
  nextCursor: string | null;
  orders: OtcOrder[];
}

export type PublicOrderBookResponse = {
  ok: boolean;
  nextCursor: string | null;
  orders: OtcOrder[];
};

export async function fetchOrders(
  jwt: string,
  params?: {
    chainId?: number;
    status?: OrderStatus;
    limit?: number;
    cursor?: string;
  },
): Promise<OrdersResponse> {
  const qs = new URLSearchParams();

  if (params?.chainId) qs.append("chainId", String(params.chainId));
  if (params?.status) qs.append("status", params.status);
  if (params?.limit) qs.append("limit", String(params.limit));
  if (params?.cursor) qs.append("cursor", params.cursor);

  const url = `${API_BASE}/orders${qs.toString() ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Orders API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function fetchPublicOrderBook(params?: {
  chainId?: number;
  sellToken?: string;
  quoteToken?: string;
  limit?: number;
  cursor?: string;
}): Promise<PublicOrderBookResponse> {
  const qs = new URLSearchParams();
  if (params?.chainId != null) qs.set("chainId", String(params.chainId));
  if (params?.sellToken) qs.set("sellToken", params.sellToken);
  if (params?.quoteToken) qs.set("quoteToken", params.quoteToken);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.cursor) qs.set("cursor", params.cursor);

  const url = `${API_BASE}/orders/public${qs.toString() ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "ngrok-skip-browser-warning": "true",
      "User-Agent": "custom/non-standard",
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GET /orders/public failed ${res.status}: ${t}`);
  }
  return res.json();
}

export async function fetchOrderSumary(jwt: string) {
  const url = `${API_BASE}/orders/summary`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      "User-Agent": "custom/non-standard",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Orders API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function checkTxHashIndexed(txHash: string): Promise<boolean> {
  const url = `${API_BASE}/orders/tx/${txHash}?waitMs=10000`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "ngrok-skip-browser-warning": "true",
      "User-Agent": "custom/non-standard",
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      `GET /orders/tx/${txHash}/waitMs=10000 failed ${res.status}: ${t}`,
    );
  }
  return true;
}
