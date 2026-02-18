import type { PropsWithChildren } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "../wagmi/config";

const qc = new QueryClient();

export function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
