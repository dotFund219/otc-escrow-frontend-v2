import { useMemo, useState } from "react";
import { useToast } from "../../../components/ui/toast/ToastProvider";
import { Dialog } from "../../../components/ui/dialog/Dialog";
import { adminSetUserTier } from "../../../lib/api/admin";
import {
  chainSetBanned,
  chainSetFrozen,
  chainSetTier2,
} from "../../../lib/web3/admin";

export function UserActionDialog({
  user,
  onClose,
  onChanged,
}: {
  user: any;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const addr = useMemo(() => user.walletAddress as `0x${string}`, [user]);

  async function run(fn: () => Promise<any>, okMsg: string) {
    setBusy(true);
    try {
      const tx = await fn();
      console.log(tx);
      toast.success(okMsg, { title: "Submitted" });
      // you could show txHash in UI here or wait for the receipt if desired
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Manage User">
      <div className="space-y-3">
        <div className="panel-inset p-3">
          <div className="text-xs muted">Wallet</div>
          <div className="font-mono text-xs mt-1">{user.walletAddress}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() => run(() => chainSetBanned(addr, true), "User banned")}
          >
            Ban
          </button>

          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              run(() => chainSetBanned(addr, false), "Ban removed")
            }
          >
            Unban
          </button>

          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() => run(() => chainSetFrozen(addr, true), "User frozen")}
          >
            Freeze
          </button>

          <button
            className="btn"
            disabled={busy}
            onClick={() => run(() => chainSetFrozen(addr, false), "Unfrozen")}
          >
            Unfreeze
          </button>

          <button
            className="btn btn-primary col-span-2"
            disabled={busy}
            onClick={() =>
              run(async () => {
                // approve tier2 on-chain
                await chainSetTier2(addr, true);
                // update tier in DB (for convenience)
                await adminSetUserTier(user.walletAddress, 2);
              }, "Tier2 approved")
            }
          >
            Approve Tier2 (On-chain + DB)
          </button>
        </div>
      </div>
    </Dialog>
  );
}
