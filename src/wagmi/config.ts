import { http, createConfig } from "wagmi";
import { mainnet, sepolia, bscTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 1);
const rpcURL = import.meta.env[`VITE_RPC_URL_${bscTestnet.id}`] as
  | string
  | undefined;

const chain =
  chainId === bscTestnet.id
    ? bscTestnet
    : chainId === sepolia.id
      ? sepolia
      : mainnet;

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [bscTestnet.id]: http(
      rpcURL || "https://data-seed-prebsc-1-s1.binance.org:8545",
    ),
  },
});
