type CloudinaryDeleteSummary = {
  attempted: number;
  deleted: number;
  skipped: number;
  errors: string[];
};

const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

function getCloudinaryConfig() {
  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || import.meta.env.CLOUDINARY_CLOUD_NAME;
  const directApiKey = import.meta.env.CLOUDINARY_API_KEY || import.meta.env.PUBLIC_CLOUDINARY_API_KEY;
  const directApiSecret = import.meta.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = import.meta.env.CLOUDINARY_URL;

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

export function getCloudinaryPublicIdFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const { cloudName } = getCloudinaryConfig();
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

export function getCloudinaryPublicIdsFromText(value: string | null | undefined): string[] {
  if (!value) return [];

  const candidates = value.match(/https?:\/\/res\.cloudinary\.com\/[^\s)"'<>]+/g) || [];
  const publicIds = candidates
    .map((candidate) => getCloudinaryPublicIdFromUrl(candidate))
    .filter((publicId): publicId is string => Boolean(publicId));

  return [...new Set(publicIds)];
}

async function sha1Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-1", encoded);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createCloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return sha1Hex(`${payload}${apiSecret}`);
}

export async function deleteCloudinaryImages(publicIds: string[]): Promise<CloudinaryDeleteSummary> {
  const ids = [...new Set(publicIds.filter(Boolean))];
  const summary: CloudinaryDeleteSummary = {
    attempted: ids.length,
    deleted: 0,
    skipped: 0,
    errors: [],
  };

  if (ids.length === 0) return summary;

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  if (!cloudName || !apiKey || !apiSecret) {
    summary.skipped = ids.length;
    summary.errors.push("Thiếu cấu hình CLOUDINARY_API_KEY hoặc CLOUDINARY_API_SECRET trên server.");
    return summary;
  }

  for (const publicId of ids) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = {
      invalidate: "true",
      public_id: publicId,
      timestamp,
    };
    const signature = await createCloudinarySignature(paramsToSign, apiSecret);
    const formData = new FormData();

    formData.set("public_id", publicId);
    formData.set("invalidate", "true");
    formData.set("timestamp", timestamp);
    formData.set("api_key", apiKey);
    formData.set("signature", signature);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: "POST",
        body: formData,
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
