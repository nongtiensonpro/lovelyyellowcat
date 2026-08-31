// galleryShare.ts — share/copy URL helpers (Phase 4). DOM-touch nhẹ, mock được.

/** Copy text qua Clipboard API; fallback execCommand cho http không secure. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Share qua Web Share API nếu có; trả false khi không hỗ trợ (caller fallback copy). */
export async function nativeShare(data: { title: string; text?: string; url: string }): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share(data);
      return true;
    }
  } catch {
    // user cancelled — coi như đã xử lý
    return true;
  }
  return false;
}

/** Tải ảnh qua fetch+blob (giữ nguyên file gốc); trả false khi CORS chặn. */
export async function downloadImage(url: string, filename: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch {
    return false;
  }
}
