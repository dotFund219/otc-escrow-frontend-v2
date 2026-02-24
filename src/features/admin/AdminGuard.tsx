import { type PropsWithChildren, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useToast } from "../../components/ui/toast/ToastProvider";
import { ABI, ADDR } from "../../lib/contract"; // adjust import path for your project

export function AdminGuard({ children }: PropsWithChildren) {
  const toast = useToast();
  const { address, isConnected } = useAccount();

  const { data: isAdmin, isLoading } = useReadContract({
    abi: ABI.admin,
    address: ADDR.contracts.admin, // recommended: manage as an object like { ADMIN: "0x..." }
    functionName: "isAdmin",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });

  const allowed = useMemo(() => !!isAdmin, [isAdmin]);

  if (!isConnected) {
    return (
      <div className="panel p-6">
        <div className="text-lg font-semibold">Admin</div>
        <div className="text-sm muted mt-2">
          Please connect your admin wallet
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="panel p-6">
        <div className="text-sm muted">Checking admin permission…</div>
      </div>
    );
  }

  if (!allowed) {
    // UX: it's better to show toast only once, but keeping it simple here
    toast.error("No admin permission", { title: "Unauthorized" });
    return (
      <div className="panel p-6">
        <div className="text-lg font-semibold">Access denied</div>
        <div className="text-sm muted mt-2">
          Please connect your admin wallet.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
