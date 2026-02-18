import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 1);
const chain = chainId === 11155111 ? sepolia : mainnet;

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: {
    1: http(),
    11155111: http(),
  },
});
