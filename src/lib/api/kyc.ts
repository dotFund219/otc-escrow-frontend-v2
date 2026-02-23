const API_BASE = import.meta.env.VITE_API_BASE;

export type KycUploadResponse = {
  ok: boolean;
  file?: {
    id: string;
    url: string; // e.g. /uploads/kyc/xxx.png
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
  };
};

type UploadKycImageArgs = {
  file: File;
  token?: string | null;
  endpoint?: string; // default: /api/kyc/upload
  signal?: AbortSignal;
};

/**
 * Upload KYC image (multipart/form-data)
 * Backend: POST /api/kyc/upload (field name: "file")
 */
export async function uploadKycImage({
  file,
  token,
  endpoint = "/kyc/upload",
  signal,
}: UploadKycImageArgs): Promise<KycUploadResponse> {
  if (!file) throw new Error("No file selected.");

  const fd = new FormData();
  fd.append("file", file);

  const url = `${API_BASE}${endpoint}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
      "User-Agent": "custom/non-standard",
    },
    body: fd,
    signal,
  });

  // try parse body for better errors
  const contentType = resp.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!resp.ok) {
    let payload: any = null;
    try {
      payload = isJson ? await resp.json() : await resp.text();
    } catch {
      // ignore
    }

    // make error string include status + body (your isUnauthorized() can parse it)
    const msg =
      typeof payload === "string"
        ? payload
        : payload
          ? JSON.stringify(payload)
          : "";

    throw new Error(`KYC upload failed ${resp.status}: ${msg}`);
  }

  return isJson ? ((await resp.json()) as KycUploadResponse) : { ok: true };
}
