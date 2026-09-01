// announcementPreview.ts — logic cho PREVIEW.ALL trong trang admin announcements.
// Tách pure để unit test bằng jsdom: DOM vào, cập nhật text + highlight theo type.
export const PREVIEW_PLACEHOLDER = "(nhập tiêu đề để xem trước...)";

const TYPE_LABEL: Record<string, string> = {
  marquee: "🎞️ MARQUEE",
  banner: "🚩 BANNER",
  popup: "🪟 POPUP",
};

export function marqueePreviewText(title: string, body: string): string {
  const t = title.trim();
  const b = body.trim();
  if (!t) return "[THÔNG BÁO] (nhập tiêu đề để xem trước...)";
  return `[THÔNG BÁO] ${t}${b ? " — " + b : ""}`;
}

export function typeLabel(type: string): string {
  return TYPE_LABEL[type] || type.toUpperCase();
}

export function popupIconFor(text: string): string {
  return /triển lãm|gallery|exhibition/i.test(text) ? "🖼️" : "📣";
}

/**
 * Gắn wiring preview cho trang admin. Trả về hàm gỡ listener (dùng trong test).
 */
export function initAnnouncementPreview(doc: Document): () => void {
  const title = doc.getElementById("ann-title") as HTMLInputElement | null;
  const body = doc.getElementById("ann-body") as HTMLTextAreaElement | null;
  const typeSel = doc.getElementById("ann-type") as HTMLSelectElement | null;
  const mqTexts = Array.from(
    doc.querySelectorAll<HTMLElement>("[data-preview-marquee-text], [data-preview-marquee-text-2]"),
  );
  const bannerTitle = doc.querySelector<HTMLElement>("[data-preview-banner-title]");
  const popupTitle = doc.querySelector<HTMLElement>("[data-preview-popup-title]");
  const popupIcon = doc.querySelector<HTMLElement>("[data-preview-popup-icon]");
  const popupBodyWrap = doc.querySelector<HTMLElement>("[data-preview-popup-body-wrap]");
  const popupBody = doc.querySelector<HTMLElement>("[data-preview-popup-body]");
  const activeLabel = doc.getElementById("ann-preview-active-label");
  const cards = Array.from(doc.querySelectorAll<HTMLElement>("[data-preview-type]"));

  function updateText(): void {
    const tv = title?.value ?? "";
    const bv = body?.value ?? "";
    const mq = marqueePreviewText(tv, bv);
    mqTexts.forEach((el) => (el.textContent = mq));
    const display = tv.trim() || PREVIEW_PLACEHOLDER;
    if (bannerTitle) bannerTitle.textContent = display;
    if (popupTitle) popupTitle.textContent = display;
    if (popupBodyWrap && popupBody) {
      if (bv.trim()) {
        popupBody.textContent = bv;
        popupBodyWrap.classList.remove("hidden");
      } else {
        popupBodyWrap.classList.add("hidden");
      }
    }
    if (popupIcon) popupIcon.textContent = popupIconFor(mq);
  }

  function updateActive(): void {
    const t = typeSel?.value || "marquee";
    cards.forEach((card) => {
      const isActive = card.getAttribute("data-preview-type") === t;
      card.classList.toggle("ann-preview-active", isActive);
      card.querySelectorAll<HTMLElement>("[data-selected-badge]").forEach((badge) => {
        badge.classList.toggle("hidden", !isActive);
      });
    });
    if (activeLabel) activeLabel.textContent = `KIỂU ĐANG CHỌN: ${typeLabel(t)}`;
  }

  const onTitle = () => updateText();
  const onBody = () => updateText();
  const onType = () => {
    updateText();
    updateActive();
  };
  title?.addEventListener("input", onTitle);
  body?.addEventListener("input", onBody);
  typeSel?.addEventListener("change", onType);
  updateText();
  updateActive();

  return () => {
    title?.removeEventListener("input", onTitle);
    body?.removeEventListener("input", onBody);
    typeSel?.removeEventListener("change", onType);
  };
}
