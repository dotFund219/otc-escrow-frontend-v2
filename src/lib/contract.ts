import OTCOrdersAbi from "../../abi/OTCOrders.json";
import OTCConfigAbi from "../../abi/OTCConfig.json";
import OTCEscrowAbi from "../../abi/OTCEscrow.json";
import OTCAdminAbi from "../../abi/OTCAdmin.json";
import { bscTestnet, mainnet, polygon, sepolia } from "wagmi/chains";

// you can keep only the chains your project uses
export const CHAIN_BY_ID: Record<number, any> = {
  1: mainnet,
  137: polygon,
  11155111: sepolia,
  97: bscTestnet,
};

// RPC URLs are recommended to be managed via environment variables
export function rpcUrl(chainId: number) {
  // e.g. VITE_RPC_1 / NEXT_PUBLIC_RPC_1, etc.
  const v = (import.meta as any)?.env?.[`VITE_RPC_URL_${chainId}`];
  return v ?? ""; // if missing, public RPC may be rate-limited
}

export const ADDR = {
  treasury: import.meta.env.VITE_TREASURY as `0x${string}`,

  tokens: {
    USDT: import.meta.env.VITE_TOKEN_USDT as `0x${string}`,
    USDC: import.meta.env.VITE_TOKEN_USDC as `0x${string}`,
    WBTC: import.meta.env.VITE_TOKEN_WBTC as `0x${string}`,
    WETH: import.meta.env.VITE_TOKEN_WETH as `0x${string}`,
  },

  contracts: {
    admin: import.meta.env.VITE_ADMIN as `0x${string}`,
    config: import.meta.env.VITE_CONTRACT_CONFIG as `0x${string}`,
    orders: import.meta.env.VITE_CONTRACT_ORDERS as `0x${string}`,
    escrow: import.meta.env.VITE_CONTRACT_ESCROW as `0x${string}`,
  },
} as const;

export const ABI = {
  orders: OTCOrdersAbi,
  config: OTCConfigAbi,
  escrow: OTCEscrowAbi,
  admin: OTCAdminAbi,
} as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
