import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from "viem";
import { ERC20_ABI, ABI, CHAIN_BY_ID, rpcUrl, ADDR } from "../contract";

export async function approveAndTakeOrder(args: {
  chainId: number;
  orderId: string; // uint256 string
  contract: string; // OTC contract address (spender + takeOrder target)
  quoteToken: string; // ERC20 token address
  quoteAmount: string; // uint256 string (raw)
}): Promise<{ tradeId?: bigint; takeTxHash: Hex; approveTxHash?: Hex }> {
  const chain = CHAIN_BY_ID[args.chainId];
  if (!chain) throw new Error(`Unsupported chainId: ${args.chainId}`);

  // MetaMask provider
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask not found");

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl(args.chainId) || undefined),
  });

  const walletClient = createWalletClient({
    chain,
    transport: custom(eth),
  });

  const [account] = await walletClient.requestAddresses();
  if (!account) throw new Error("No wallet account");

  const spender = args.contract.toLowerCase() as Address;
  const token = args.quoteToken.toLowerCase() as Address;
  const orderContract = args.contract.toLowerCase() as Address;
  const configContract = ADDR.contracts.config.toLowerCase() as Address;

  const need = BigInt(args.quoteAmount || "0");

  // calculate fee
  const feeBps = await publicClient.readContract({
    address: configContract,
    abi: ABI.config,
    functionName: "feeBps",
  });

  const fee = (need * BigInt(feeBps as string | number | bigint)) / 10000n;
  const totalCost = need + fee;

  // 1) check balance (optional, but good UX)
  const balance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account],
  });

  if (balance < totalCost) {
    throw new Error("Insufficient balance");
  }

  // 2) check allowance
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account, spender],
  });

  let approveTxHash: Hex | undefined;

  // 3) approve if needed
  if (allowance < totalCost) {
    // ✅ conservative: approve exactly what's needed
    // (can switch to MaxUint256 approval if desired)
    approveTxHash = await walletClient.writeContract({
      account,
      address: token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, totalCost],
      chain: chain,
    });

    // wait for approval confirmation
    await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
  }

  // 4) takeOrder 호출
  const takeTxHash = await walletClient.writeContract({
    account,
    address: orderContract,
    abi: ABI.orders,
    functionName: "takeOrder",
    args: [BigInt(args.orderId)],
    chain: chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: takeTxHash,
  });

  // takeOrder returns a value (tradeId), but it's often impossible to extract
  // it directly from the EVM tx receipt.
  // Typically you'd read tradeId from an event (parse it if the contract emits one).
  // For now we just return the txHash.
  return { takeTxHash, approveTxHash };
}
