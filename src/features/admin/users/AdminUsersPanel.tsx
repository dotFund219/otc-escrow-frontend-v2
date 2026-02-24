import { useEffect, useMemo, useState } from "react";
import { adminListUsers } from "../../../lib/api/admin";
import { useToast } from "../../../components/ui/toast/ToastProvider";
import { UserActionDialog } from "./UserActionDialog";
import { useSiweAuth } from "../../auth/useSiweAuth";
import { Dialog } from "../../../components/ui/dialog/Dialog";

type KycInfo = {
  id: string;
  originalName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  url: string;
  createdAt: string;
};

type AdminUser = {
  id: number;
  address: string;
  role: string | null;
  kycTier: number;
  email?: string | null;
  companyName?: string | null;
  createdAt: string;
  kyc?: KycInfo | null;
};

function statusPill(status?: string | null) {
  if (status === "APPROVED")
    return "bg-emerald-500/12 border-emerald-400/20 text-emerald-200";
  if (status === "REJECTED")
    return "bg-red-500/12 border-red-400/20 text-red-200";
  if (status === "PENDING")
    return "bg-yellow-500/12 border-yellow-400/20 text-yellow-200";
  return "bg-zinc-500/10 border-white/10 text-zinc-200/80";
}

function shortAddr(a?: string) {
  if (!a) return "-";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function AdminUsersPanel() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [kycPreview, setKycPreview] = useState<{
    user: AdminUser;
    kyc: KycInfo;
  } | null>(null);

  const { token } = useSiweAuth();

  async function load() {
    setLoading(true);
    try {
      if (!token) {
        toast.error("Failed to load users: No authentication token");
        return;
      }
      const res = await adminListUsers(token, { q: q.trim() || undefined });

      const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

      setUsers(
        res.users.map((u: any) => ({
          ...u,
          kyc: u.kyc?.url
            ? {
                ...u.kyc,
                url: u.kyc.url.startsWith("http")
                  ? u.kyc.url
                  : `${BASE}${u.kyc.url}`,
              }
            : u.kyc,
        })),
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => users, [users]);

  return (
    <div className="panel-inset p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Users</div>
          <div className="text-sm muted">
            DB users + KYC uploads + on-chain admin controls
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="input w-[300px]"
            placeholder="Search wallet…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
          />
          <button className="btn" onClick={load}>
            {loading ? "Loading…" : "Search"}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-auto rounded-xl border border-white/10 bg-black/10">
        <table className="w-full text-sm">
          <thead className="muted sticky top-0 bg-black/30 backdrop-blur">
            <tr className="text-left">
              <th className="py-3 px-3">Wallet</th>
              <th className="px-3">Tier</th>
              <th className="px-3">Role</th>
              <th className="px-3">KYC</th>
              <th className="px-3">Email</th>
              <th className="px-3">Company</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.id}
                className="
                  border-t border-white/10
                  hover:bg-white/[0.03] transition
                "
              >
                {/* Wallet */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs">
                      {u.kycTier >= 2 ? "T2" : "T1"}
                    </div>

                    <div className="min-w-0">
                      <div className="font-mono text-xs truncate max-w-[240px]">
                        {u.address}
                      </div>
                      <div className="text-[11px] muted mt-0.5">
                        Created {new Date(u.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Tier */}
                <td className="px-3">
                  <span className="pill text-[11px]">Tier {u.kycTier}</span>
                </td>

                {/* Role */}
                <td className="px-3">
                  <span className="text-xs">{u.role || "-"}</span>
                </td>

                {/* KYC */}
                <td className="px-3">
                  {u.kyc?.url ? (
                    <div className="flex items-center gap-3">
                      <button
                        className="
                          group relative
                          w-12 h-12 rounded-xl overflow-hidden
                          border border-white/10 bg-white/5
                          hover:border-white/20 transition
                        "
                        onClick={() => setKycPreview({ user: u, kyc: u.kyc! })}
                        title="View KYC"
                      >
                        <img
                          src={u.kyc.url}
                          alt={u.kyc.originalName}
                          className="w-full h-full object-cover opacity-95 group-hover:opacity-100"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-emerald-400/40 transition" />
                      </button>

                      <div className="min-w-0">
                        <div
                          className={`
                            inline-flex items-center gap-2
                            whitespace-nowrap rounded-full px-3 py-1
                            text-[11px] font-semibold border
                            ${statusPill(u.kyc.status)}
                          `}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          {u.kyc.status}
                        </div>
                        <div className="text-[11px] muted mt-1 truncate max-w-[220px]">
                          {u.kyc.originalName}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs muted">No upload</div>
                  )}
                </td>

                {/* Email */}
                <td className="px-3">
                  <div className="truncate max-w-[220px]">{u.email || "-"}</div>
                </td>

                {/* Company */}
                <td className="px-3">
                  <div className="truncate max-w-[220px]">
                    {u.companyName || "-"}
                  </div>
                </td>

                {/* Action */}
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {u.kyc?.url && (
                      <button
                        className="btn"
                        onClick={() => setKycPreview({ user: u, kyc: u.kyc! })}
                      >
                        View
                      </button>
                    )}
                    <button className="btn" onClick={() => setSelected(u)}>
                      Manage
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center muted">
                  No users
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manage dialog */}
      {selected && (
        <UserActionDialog
          user={selected}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}

      {/* KYC preview dialog */}
      {kycPreview && (
        <Dialog
          open
          onClose={() => setKycPreview(null)}
          title={
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold">KYC Document</div>
                <div className="text-sm muted mt-1 font-mono truncate">
                  {shortAddr(kycPreview.user.address)}
                </div>
              </div>
              <div
                className={`
                  inline-flex items-center gap-2
                  rounded-full px-3 py-1 text-[11px] font-semibold border
                  ${statusPill(kycPreview.kyc.status)}
                `}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                {kycPreview.kyc.status}
              </div>
            </div>
          }
          size="lg"
          footer={
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs muted truncate">
                {kycPreview.kyc.originalName} • Uploaded{" "}
                {new Date(kycPreview.kyc.createdAt).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <a
                  className="btn"
                  href={kycPreview.kyc.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open original
                </a>
                <button className="btn" onClick={() => setKycPreview(null)}>
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8">
              <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                <img
                  src={kycPreview.kyc.url}
                  alt={kycPreview.kyc.originalName}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <div className="panel-inset p-4">
                <div className="text-xs muted">User</div>
                <div className="font-mono text-xs mt-1 break-all">
                  {kycPreview.user.address}
                </div>

                <div className="mt-4 text-xs muted">Tier</div>
                <div className="mt-1">
                  <span className="pill text-[11px]">
                    Tier {kycPreview.user.kycTier}
                  </span>
                </div>

                <div className="mt-4 text-xs muted">File</div>
                <div className="text-sm mt-1 break-all">
                  {kycPreview.kyc.originalName}
                </div>

                <div className="mt-4 text-xs muted">KYC Status</div>
                <div className="mt-1">
                  <span
                    className={`
                      inline-flex items-center gap-2 rounded-full px-3 py-1
                      text-[11px] font-semibold border
                      ${statusPill(kycPreview.kyc.status)}
                    `}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                    {kycPreview.kyc.status}
                  </span>
                </div>

                <div className="mt-4 text-xs muted">Uploaded</div>
                <div className="text-sm mt-1">
                  {new Date(kycPreview.kyc.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
