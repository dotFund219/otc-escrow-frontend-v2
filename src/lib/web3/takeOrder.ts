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

  // fee 계산
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

  // 2) allowance 체크
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account, spender],
  });

  let approveTxHash: Hex | undefined;

  // 3) 필요하면 approve
  if (allowance < totalCost) {
    // ✅ 보수적: 딱 필요한 만큼 approve
    // (원하면 MaxUint256 approve로 바꿀 수 있음)
    approveTxHash = await walletClient.writeContract({
      account,
      address: token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, totalCost],
      chain: chain,
    });

    // approve 확정 기다림
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

  // takeOrder가 return(tradeId)을 리턴하지만, EVM tx receipt만으로는 직접 못 뽑는 경우가 많아서
  // 보통은 이벤트에서 tradeId를 읽는다. (컨트랙트에 event가 있으면 그걸 파싱)
  // 여기서는 일단 txHash만 반환.
  return { takeTxHash, approveTxHash };
}
