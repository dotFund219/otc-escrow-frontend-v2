import { authedFetch } from "../authedFetch";

export type AdminUser = {
  id: number;
  walletAddress: string;
  kycTier: number;
  role: string | null;
  email: string | null;
  companyName: string | null;
  createdAt: string;
};

export type KycUpload = {
  id: string;
  userWalletAddress?: string; // handy if backend joins and returns this for the UI
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  relativePath: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

export async function adminListUsers(token?: string, params?: { q?: string }) {
  const qs = params?.q ? `?q=${encodeURIComponent(params.q)}` : "";
  return authedFetch<{ ok: true; users: AdminUser[] }>(
    `/users/all${qs}`,
    token,
  );
}

export async function adminSetUserTier(
  walletAddress: string,
  kycTier: number,
  token?: string,
) {
  return authedFetch<{ ok: true }>(
    `/admin/users/${walletAddress}/tier`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ kycTier }),
    },
  );
}

export async function adminListKycUploads(params?: {
  status?: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const qs = params?.status ? `?status=${params.status}` : "";
  return authedFetch<{ ok: true; uploads: KycUpload[] }>(
    `/admin/kyc/uploads${qs}`,
  );
}

export async function adminReviewKycUpload(
  uploadId: string,
  status: "APPROVED" | "REJECTED",
  token?: string,
) {
  return authedFetch<{ ok: true }>(
    `/admin/kyc/uploads/${uploadId}/review`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    },
  );
}
