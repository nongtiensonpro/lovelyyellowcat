type CloudinaryDeleteSummary = {
  attempted: number;
  deleted: number;
  skipped: number;
  errors: string[];
};

export type CloudinaryRuntimeEnv = Partial<{
  PUBLIC_CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_URL: string;
}>;

const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

function getCloudinaryConfig(runtimeEnv?: CloudinaryRuntimeEnv) {
  const cloudName = runtimeEnv?.PUBLIC_CLOUDINARY_CLOUD_NAME
    || runtimeEnv?.CLOUDINARY_CLOUD_NAME
    || import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME
    || import.meta.env.CLOUDINARY_CLOUD_NAME
    || (typeof process !== "undefined" ? process.env?.PUBLIC_CLOUDINARY_CLOUD_NAME || process.env?.CLOUDINARY_CLOUD_NAME : undefined);

  const directApiKey = runtimeEnv?.CLOUDINARY_API_KEY
    || import.meta.env.CLOUDINARY_API_KEY
    || (typeof process !== "undefined" ? process.env?.CLOUDINARY_API_KEY : undefined);

  const directApiSecret = runtimeEnv?.CLOUDINARY_API_SECRET
    || import.meta.env.CLOUDINARY_API_SECRET
    || (typeof process !== "undefined" ? process.env?.CLOUDINARY_API_SECRET : undefined);

  const cloudinaryUrl = runtimeEnv?.CLOUDINARY_URL
    || import.meta.env.CLOUDINARY_URL
    || (typeof process !== "undefined" ? process.env?.CLOUDINARY_URL : undefined);

  if (cloudinaryUrl && (!directApiKey || !directApiSecret || !cloudName)) {
    try {
      const parsed = new URL(cloudinaryUrl);

      return {
        cloudName: cloudName || parsed.hostname,
        apiKey: directApiKey || parsed.username,
        apiSecret: directApiSecret || parsed.password,
      };
    } catch {
      return {
        cloudName,
        apiKey: directApiKey,
        apiSecret: directApiSecret,
      };
    }
  }

  return {
    cloudName,
    apiKey: directApiKey,
    apiSecret: directApiSecret,
  };
}

function isCloudinaryDeliveryUrl(value: string, cloudName: string) {
  try {
    const url = new URL(value);
    return url.hostname === "res.cloudinary.com"
      && url.pathname.includes(`/${cloudName}${CLOUDINARY_UPLOAD_MARKER}`);
  } catch {
    return false;
  }
}

export function getCloudinaryPublicIdFromUrl(value: string | null | undefined, runtimeEnv?: CloudinaryRuntimeEnv): string | null {
  if (!value) return null;

  const { cloudName } = getCloudinaryConfig(runtimeEnv);
  if (!cloudName || !isCloudinaryDeliveryUrl(value, cloudName)) return null;

  const url = new URL(value);
  const marker = `/${cloudName}${CLOUDINARY_UPLOAD_MARKER}`;
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex === -1) return null;

  const rawPath = url.pathname.slice(markerIndex + marker.length);
  const pathParts = rawPath.split("/").filter(Boolean);
  const versionIndex = pathParts.findIndex((part) => /^v\d+$/.test(part));
  const publicPathParts = versionIndex >= 0
    ? pathParts.slice(versionIndex + 1)
    : pathParts;

  if (publicPathParts.length === 0) return null;

  const decodedPublicPath = publicPathParts.map((part) => decodeURIComponent(part)).join("/");

  return decodedPublicPath.replace(/\.[a-z0-9]+$/i, "") || null;
}

export function getCloudinaryPublicIdsFromText(value: string | null | undefined, runtimeEnv?: CloudinaryRuntimeEnv): string[] {
  if (!value) return [];

  const candidates = value.match(/https?:\/\/res\.cloudinary\.com\/[^\s)"'<>]+/g) || [];
  const publicIds = candidates
    .map((candidate) => getCloudinaryPublicIdFromUrl(candidate, runtimeEnv))
    .filter((publicId): publicId is string => Boolean(publicId));

  return [...new Set(publicIds)];
}

export interface CloudinaryImageResource {
  public_id: string;
  secure_url: string;
  created_at: string;
  bytes?: number;
  width?: number;
  height?: number;
  format?: string;
  filename?: string;
  folder?: string;
}

export interface CloudinaryListResult {
  resources: CloudinaryImageResource[];
  nextCursor: string | null;
  totalCount?: number;
  error?: string;
}

/**
 * Tìm kiếm nâng cao qua Cloudinary Search API (POST /resources/search).
 * Hỗ trợ: từ khóa theo tên file/public_id, thư mục, dung lượng, ngày tải, sắp xếp,
 * phân trang con trỏ — tất cả phía server, key/secret không bao giờ xuống client.
 */
export async function searchCloudinaryImages(
  opts: {
    q?: string;
    folder?: string;
    minBytes?: number;
    uploadedAfter?: string; // "YYYY-MM-DD"
    sortKey?: "newest" | "oldest" | "largest" | "smallest" | "name";
    maxResults?: number;
    nextCursor?: string;
  },
  runtimeEnv?: CloudinaryRuntimeEnv
): Promise<CloudinaryListResult> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig(runtimeEnv);

  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [
      !cloudName ? "cloud_name" : null,
      !apiKey ? "api_key" : null,
      !apiSecret ? "api_secret" : null,
    ].filter(Boolean).join(", ");
    return {
      resources: [],
      nextCursor: null,
      error: `Thiếu cấu hình Cloudinary trên server: ${missing}. `
        + `CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET phải khai báo trong Cloudflare Dashboard (Variables & Secrets của Worker).`,
    };
  }

  const diag = `[cloud=${cloudName}, api_key=${maskKey(apiKey)}]`;

  // ── Dựng biểu thức tìm kiếm (cú pháp Search API) ──
  const clauses: string[] = [`resource_type:image`];
  const safe = (v: string) => v.replace(/"/g, "").trim();

  if (opts.q && opts.q.trim()) {
    const kw = safe(opts.q);
    clauses.push(`(filename:${kw}* OR public_id:${kw}*)`);
  }
  if (opts.folder && opts.folder.trim()) {
    clauses.push(`folder="${safe(opts.folder)}"`);
  }
  if (opts.minBytes && opts.minBytes > 0) {
    clauses.push(`bytes>=${Math.floor(opts.minBytes)}`);
  }
  if (opts.uploadedAfter && /^\d{4}-\d{2}-\d{2}$/.test(opts.uploadedAfter)) {
    clauses.push(`uploaded_at>="${opts.uploadedAfter}"`);
  }

  const sortMap = {
    newest: { created_at: "desc" },
    oldest: { created_at: "asc" },
    largest: { bytes: "desc" },
    smallest: { bytes: "asc" },
    name: { public_id: "asc" },
  } as const;
  const sortBy = [sortMap[opts.sortKey ?? "newest"]];

  try {
    const body: Record<string, unknown> = {
      expression: clauses.join(" AND "),
      max_results: Math.min(200, Math.max(1, opts.maxResults ?? 60)),
      fields: ["public_id", "filename", "format", "bytes", "width", "height", "created_at", "folder"],
      sort_by: sortBy,
    };
    if (opts.nextCursor) body.next_cursor = opts.nextCursor;

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      {
        method: "POST",
        headers: {
          Authorization: cloudinaryBasicAuthHeader(apiKey, apiSecret),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      const apiMsg = data?.error?.message || `HTTP ${response.status}`;
      const hint = /credential|secret|auth/i.test(apiMsg)
        ? ` → Cặp api_key ↔ api_secret không khớp với tài khoản "${cloudName}". Vào Cloudflare Dashboard → Worker lovelyyellowcat → Variables & Secrets để cập nhật.`
        : "";
      return { resources: [], nextCursor: null, error: `${apiMsg} ${diag}.${hint}` };
    }

    const resources: CloudinaryImageResource[] = (data.resources || []).map((r: any) => ({
      public_id: r.public_id,
      secure_url: r.secure_url || r.url || "",
      created_at: r.created_at,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
      format: r.format,
      filename: r.filename,
      folder: r.folder,
    }));

    return {
      resources,
      nextCursor: data.next_cursor || null,
      totalCount: typeof data.total_count === "number" ? data.total_count : undefined,
    };
  } catch (error: any) {
    return { resources: [], nextCursor: null, error: `${error.message || String(error)} ${diag}` };
  }
}

/** Che giấu khóa: chỉ hiện 4 ký tự cuối để đối chiếu mà không lộ secret */
function maskKey(value?: string): string {
  if (!value) return "(trống)";
  return value.length <= 4 ? "****" : `••••${value.slice(-4)}`;
}

/**
 * Header xác thực HTTP Basic cho Cloudinary Admin API.
 * Tài khoản hiện tại từ chối chữ ký query-style cũ — Basic Auth được xác minh hoạt động.
 */
function cloudinaryBasicAuthHeader(apiKey: string, apiSecret: string): string {
  return `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
}

/**
 * Liệt kê ảnh trong thư viện Cloudinary qua Admin API (Basic Auth).
 * Key/secret chỉ tồn tại phía server — không bao giờ xuống client.
 */
export async function listCloudinaryImages(
  opts: { maxResults?: number; nextCursor?: string },
  runtimeEnv?: CloudinaryRuntimeEnv
): Promise<CloudinaryListResult> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig(runtimeEnv);

  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [
      !cloudName ? "cloud_name" : null,
      !apiKey ? "api_key" : null,
      !apiSecret ? "api_secret" : null,
    ].filter(Boolean).join(", ");
    return {
      resources: [],
      nextCursor: null,
      error: `Thiếu cấu hình Cloudinary trên server: ${missing}. `
        + `CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET phải khai báo trong Cloudflare Dashboard (Variables & Secrets của Worker), không phải trong .env local.`,
    };
  }

  const diag = `[cloud=${cloudName}, api_key=${maskKey(apiKey)}]`;

  try {
    const params: Record<string, string> = {};
    if (opts.nextCursor) params.next_cursor = opts.nextCursor;
    if (opts.maxResults) params.max_results = String(opts.maxResults);
    const query = new URLSearchParams(params);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?${query.toString()}`,
      { headers: { Authorization: cloudinaryBasicAuthHeader(apiKey, apiSecret) } }
    );
    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      const apiMsg = data?.error?.message || `HTTP ${response.status}`;
      const hint = /credential|secret|auth/i.test(apiMsg)
        ? ` → Cặp api_key ↔ api_secret không khớp với tài khoản "${cloudName}". Vào Cloudflare Dashboard → Worker lovelyyellowcat → Variables & Secrets để cập nhật lại 2 biến CLOUDINARY_API_KEY & CLOUDINARY_API_SECRET.`
        : "";
      return { resources: [], nextCursor: null, error: `${apiMsg} ${diag}.${hint}` };
    }

    return {
      resources: (data.resources || []) as CloudinaryImageResource[],
      nextCursor: data.next_cursor || null,
    };
  } catch (error: any) {
    return { resources: [], nextCursor: null, error: `${error.message || String(error)} ${diag}` };
  }
}

export async function deleteCloudinaryImages(publicIds: string[], runtimeEnv?: CloudinaryRuntimeEnv): Promise<CloudinaryDeleteSummary> {
  const ids = [...new Set(publicIds.filter(Boolean))];
  const summary: CloudinaryDeleteSummary = {
    attempted: ids.length,
    deleted: 0,
    skipped: 0,
    errors: [],
  };

  if (ids.length === 0) return summary;

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig(runtimeEnv);
  if (!cloudName || !apiKey || !apiSecret) {
    summary.skipped = ids.length;
    summary.errors.push("Thiếu cấu hình CLOUDINARY_API_KEY hoặc CLOUDINARY_API_SECRET trên server.");
    return summary;
  }

  for (const publicId of ids) {
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: "POST",
        headers: {
          Authorization: cloudinaryBasicAuthHeader(apiKey, apiSecret),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ public_id: publicId, invalidate: "true" }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        summary.errors.push(`${publicId}: ${result.error?.message || `HTTP ${response.status}`}`);
        continue;
      }

      if (result.result === "ok") {
        summary.deleted += 1;
      } else if (result.result === "not found") {
        summary.skipped += 1;
      } else {
        summary.errors.push(`${publicId}: Cloudinary trả về "${result.result || "unknown"}"`);
      }
    } catch (error: any) {
      summary.errors.push(`${publicId}: ${error.message || error}`);
    }
  }

  return summary;
}

export function formatCloudinaryDeleteSummary(summary: CloudinaryDeleteSummary) {
  if (summary.attempted === 0) {
    return "Không có ảnh Cloudinary liên quan cần xóa.";
  }

  const parts = [`Cloudinary: đã xóa ${summary.deleted}/${summary.attempted} ảnh`];
  if (summary.skipped > 0) parts.push(`bỏ qua ${summary.skipped}`);
  if (summary.errors.length > 0) parts.push(`lỗi: ${summary.errors.join("; ")}`);

  return parts.join(", ");
}
