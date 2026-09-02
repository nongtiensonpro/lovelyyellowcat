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
    applyFxToPreviews(doc);
  };
  const onFx = () => applyFxToPreviews(doc);
  title?.addEventListener("input", onTitle);
  body?.addEventListener("input", onBody);
  typeSel?.addEventListener("change", onType);
  doc.getElementById("ann-accent")?.addEventListener("change", onFx);
  doc.getElementById("ann-fx")?.addEventListener("change", onFx);
  doc.querySelectorAll<HTMLInputElement>('input[name="icon"]').forEach((r) => {
    r.addEventListener("change", onFx);
  });
  applyFxToPreviews(doc);
  updateText();
  updateActive();

  return () => {
    title?.removeEventListener("input", onTitle);
    body?.removeEventListener("input", onBody);
    typeSel?.removeEventListener("change", onType);
    doc.getElementById("ann-accent")?.removeEventListener("change", onFx);
    doc.getElementById("ann-fx")?.removeEventListener("change", onFx);
  };
}


/** ANNOUNCE.FX v2 — áp accent/fx/icon cho 1 element preview (pure, test được). */
export function applyFxToEl(
  el: HTMLElement,
  opts: { accentClass?: string; fxClass?: string; icon?: string },
): void {
  const { accentClass = "", fxClass = "", icon } = opts;
  // màu: bỏ class text-vapor-* cũ rồi thêm mới (không đụng class khác)
  for (const c of Array.from(el.classList)) {
    if (c.startsWith("text-vapor-")) el.classList.remove(c);
  }
  if (accentClass) el.classList.add(accentClass);
  // hiệu ứng: bỏ ann-fx-* cũ rồi thêm mới
  for (const c of Array.from(el.classList)) {
    if (c.startsWith("ann-fx-")) el.classList.remove(c);
  }
  if (fxClass) el.classList.add(fxClass);
  // icon: data-preview-icon slot (nếu có) đổi textContent
  if (icon !== undefined) {
    const slot = el.querySelector<HTMLElement>("[data-fx-icon]");
    if (slot) slot.textContent = icon;
  }
}

/** Gom trạng thái FX hiện tại của form (pure-ish: đọc 3 control). */
export function readFxControls(
  doc: Document,
): { accent: string; fx: string; icon: string } {
  const accent = (doc.getElementById("ann-accent") as HTMLSelectElement | null)?.value ?? "";
  const fx = (doc.getElementById("ann-fx") as HTMLSelectElement | null)?.value ?? "";
  const icon =
    doc.querySelector<HTMLInputElement>('input[name="icon"]:checked')?.value ?? "auto";
  return { accent, fx, icon };
}

/** Áp trạng thái FX lên cả 3 khung preview (marquee/banner/popup). */
export function applyFxToPreviews(doc: Document): void {
  const { accent, fx, icon } = readFxControls(doc);
  const accentClass = accent ? `text-vapor-${accent}` : "";
  const fxClass = fx && fx !== "none" ? `ann-fx-${fx}` : "";
  // icon map value → emoji (bảng nhỏ local; source of truth vẫn là utils nhưng tránh import vòng)
  const ICONS: Record<string, string> = {
    megaphone: "📣", bullhorn: "📢", warning: "⚠️", party: "🎉", wrench: "🔧",
    bulb: "💡", pin: "📌", heart: "❤️", star: "⭐", dot: "🔴", frame: "🖼️", window: "🪟",
  };
  const autoIcon = doc.getElementById("ann-type")?.getAttribute("data-icon-default") || "📣";
  const iconChar = icon === "auto" ? autoIcon : (ICONS[icon] ?? "📣");
  // marquee: text element trong khung 1
  doc.querySelectorAll<HTMLElement>("[data-preview-marquee-text], [data-preview-marquee-text-2]").forEach((el) => {
    applyFxToEl(el, { accentClass, fxClass });
  });
  // banner title
  const bt = doc.querySelector<HTMLElement>("[data-preview-banner-title]");
  if (bt) applyFxToEl(bt, { accentClass, fxClass, icon: iconChar });
  // popup title + icon lớn
  const pt = doc.querySelector<HTMLElement>("[data-preview-popup-title]");
  if (pt) applyFxToEl(pt, { accentClass, fxClass });
  const pi = doc.querySelector<HTMLElement>("[data-preview-popup-icon]");
  if (pi) pi.textContent = iconChar;
}