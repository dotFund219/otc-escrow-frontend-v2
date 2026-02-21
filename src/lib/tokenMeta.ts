import { createPublicClient, http, erc20Abi, type Address } from "viem";
import { CHAIN_BY_ID, rpcUrl } from "./contract";

export type TokenMeta = { symbol: string; decimals: number };

const memCache = new Map<string, TokenMeta>(); // key = `${chainId}:${addrLower}`

function key(chainId: number, token: string) {
  return `${chainId}:${token.toLowerCase()}`;
}

export async function getTokenMeta(
  chainId: number,
  token: string,
): Promise<TokenMeta> {
  const k = key(chainId, token);
  const hit = memCache.get(k);
  if (hit) return hit;

  const chain = CHAIN_BY_ID[chainId];
  if (!chain) {
    const fallback = { symbol: token.slice(0, 6), decimals: 18 };
    memCache.set(k, fallback);
    return fallback;
  }

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl(chainId) || undefined),
  });

  try {
    const addr = token as Address;

    // fetch both at once with multicall
    const [symbol, decimals] = await client.multicall({
      contracts: [
        { address: addr, abi: erc20Abi, functionName: "symbol" },
        { address: addr, abi: erc20Abi, functionName: "decimals" },
      ],
      allowFailure: true,
    });

    const meta: TokenMeta = {
      symbol:
        symbol.status === "success"
          ? (symbol.result as string)
          : token.slice(0, 6),
      decimals:
        decimals.status === "success" ? (decimals.result as number) : 18,
    };

    memCache.set(k, meta);
    return meta;
  } catch {
    const fallback = { symbol: token.slice(0, 6), decimals: 18 };
    memCache.set(k, fallback);
    return fallback;
  }
}

// ---------- formatting helpers ----------

// BigInt -> "human" string with decimals (no exponent)
export function formatUnits(
  raw: string,
  decimals: number,
  maxFrac = 6,
): string {
  let x = BigInt(raw || "0");
  const neg = x < 0n;
  if (neg) x = -x;

  const base = 10n ** BigInt(decimals);
  const int = x / base;
  const frac = x % base;

  // frac padding
  let fracStr = frac.toString().padStart(decimals, "0");
  // trim to maxFrac
  if (decimals > maxFrac) fracStr = fracStr.slice(0, maxFrac);
  // trim trailing zeros
  fracStr = fracStr.replace(/0+$/, "");

  const out = fracStr.length ? `${int.toString()}.${fracStr}` : int.toString();
  return neg ? `-${out}` : out;
}

// PRICE = quoteHuman / sellHuman
// = (quoteAmount * 10^sellDec) / (sellAmount * 10^quoteDec)
export function formatPrice(
  quoteAmountRaw: string,
  quoteDec: number,
  sellAmountRaw: string,
  sellDec: number,
  dp = 6,
): string {
  const quote = BigInt(quoteAmountRaw || "0");
  const sell = BigInt(sellAmountRaw || "0");
  if (sell === 0n) return "0";

  const scale = 10n ** BigInt(dp);
  const num = quote * 10n ** BigInt(sellDec) * scale;
  const den = sell * 10n ** BigInt(quoteDec);

  const pScaled = num / den; // integer scaled by dp
  const int = pScaled / scale;
  const frac = (pScaled % scale)
    .toString()
    .padStart(dp, "0")
    .replace(/0+$/, "");
  return frac.length ? `${int.toString()}.${frac}` : int.toString();
}

export function formatVolB(n: number) {
  if (!Number.isFinite(n)) return "0.00B";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}
