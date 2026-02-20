import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from "viem";
import { ABI, ADDR, CHAIN_BY_ID, rpcUrl } from "../contract";

export async function submitDeliveryTx(args: {
  chainId: number;
  tradeId: string;
  txid: string;
}) {
  const chain = CHAIN_BY_ID[args.chainId];
  if (!chain) throw new Error("Unsupported chain");

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
    functionName: "submitDeliveryTx",
    args: [BigInt(args.tradeId), args.txid],
    chain,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return hash as Hex;
}
