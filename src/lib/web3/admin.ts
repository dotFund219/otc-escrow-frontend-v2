import { writeContract, readContract } from "@wagmi/core";
import { wagmiConfig } from "../../wagmi/config"; // adjust to your project's wagmi config path
import { ADDR, ABI } from "../contract";

export async function chainIsAdmin(addr: `0x${string}`) {
  return readContract(wagmiConfig, {
    address: ADDR.contracts.admin,
    abi: ABI.admin,
    functionName: "isAdmin",
    args: [addr],
  }) as Promise<boolean>;
}

export async function chainSetBanned(user: `0x${string}`, banned: boolean) {
  return writeContract(wagmiConfig, {
    address: ADDR.contracts.admin,
    abi: ABI.admin,
    functionName: "setBanned",
    args: [user, banned],
  });
}

export async function chainSetFrozen(user: `0x${string}`, frozen: boolean) {
  return writeContract(wagmiConfig, {
    address: ADDR.contracts.admin,
    abi: ABI.admin,
    functionName: "setFrozen",
    args: [user, frozen],
  });
}

export async function chainSetTier2(user: `0x${string}`, approved: boolean) {
  return writeContract(wagmiConfig, {
    address: ADDR.contracts.admin,
    abi: ABI.admin,
    functionName: "setTier2",
    args: [user, approved],
  });
}

export async function chainAdminForceRelease(tradeId: bigint) {
  return writeContract(wagmiConfig, {
    address: ADDR.contracts.escrow,
    abi: ABI.escrow,
    functionName: "adminForceRelease",
    args: [tradeId],
  });
}

export async function chainAdminForceRefund(tradeId: bigint) {
  return writeContract(wagmiConfig, {
    address: ADDR.contracts.escrow,
    abi: ABI.escrow,
    functionName: "adminForceRefund",
    args: [tradeId],
  });
}
