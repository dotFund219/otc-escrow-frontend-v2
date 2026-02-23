import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from "viem";
import { CHAIN_BY_ID, rpcUrl, ABI, ADDR } from "../contract";

export async function rejectReceipt(args: {
  chainId: number;
  tradeId: string;
}) {
  const chain = CHAIN_BY_ID[args.chainId];
  if (!chain) throw new Error(`Unsupported chainId: ${args.chainId}`);

  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask not found");

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl(args.chainId)),
  });

  const walletClient = createWalletClient({
    chain,
    transport: custom(eth),
  });

  const [account] = await walletClient.requestAddresses();
  if (!account) throw new Error("Wallet not connected");

  const hash = await walletClient.writeContract({
    account,
    address: ADDR.contracts.escrow.toLowerCase() as Address,
    abi: ABI.escrow,
    functionName: "rejectReceipt",
    args: [BigInt(args.tradeId)],
    chain,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return hash as Hex;
}
