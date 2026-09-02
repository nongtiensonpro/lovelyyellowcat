// announcementPreviewFx.test.ts — ANNOUNCE.FX v2: wiring preview accent/fx/icon (jsdom).
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  applyFxToEl,
  readFxControls,
  applyFxToPreviews,
  initAnnouncementPreview,
  typeLabel,
  popupIconFor,
  marqueePreviewText,
} from "../../src/lib/announcementPreview";

/** Dựng DOM tối thiểu giống admin form + 3 khung preview. */
function setupDoc(): Document {
  const html = `
    <select id="ann-type" data-icon-default="📣">
      <option value="marquee" selected>marquee</option>
      <option value="banner">banner</option>
      <option value="popup">popup</option>
    </select>
    <input id="ann-title" value="Bảo trì hệ thống" />
    <textarea id="ann-body">22h tối nay</textarea>
    <select id="ann-accent">
      <option value="" selected>Mặc định</option>
      <option value="pink">pink</option>
      <option value="green">green</option>
    </select>
    <select id="ann-fx">
      <option value="none" selected>Tắt</option>
      <option value="neon">neon</option>
      <option value="rainbow">rainbow</option>
    </select>
    <input type="radio" name="icon" value="auto" checked />
    <input type="radio" name="icon" value="party" />
    <span data-preview-marquee-text>[THÔNG BÁO] x</span>
    <span data-preview-marquee-text-2>[THÔNG BÁO] x</span>
    <p data-preview-banner-title><span data-fx-icon>🚩</span><span class="t">title</span></p>
    <p data-preview-popup-title>title</p>
    <span data-preview-popup-icon>📣</span>`;
  const doc = document.implementation.createHTMLDocument("test");
  doc.body.innerHTML = html;
  return doc;
}

describe("ANNOUNCE.FX — applyFxToEl (pure DOM)", () => {
  it("thêm accent + fx class, thay icon, và THAY ĐỔI được (không cộng dồn)", () => {
    const doc = setupDoc();
    const el = doc.querySelector<HTMLElement>("[data-preview-banner-title]")!;
    applyFxToEl(el, { accentClass: "text-vapor-pink", fxClass: "ann-fx-neon", icon: "🎉" });
    expect(el.classList.contains("text-vapor-pink")).toBe(true);
    expect(el.classList.contains("ann-fx-neon")).toBe(true);
    const slot = el.querySelector<HTMLElement>("[data-fx-icon]");
    expect(slot?.textContent).toBe("🎉");
    // đổi sang accent khác — class cũ phải bị THÁO
    applyFxToEl(el, { accentClass: "text-vapor-green", fxClass: "ann-fx-rainbow" });
    expect(el.classList.contains("text-vapor-pink")).toBe(false);
    expect(el.classList.contains("ann-fx-neon")).toBe(false);
    expect(el.classList.contains("text-vapor-green")).toBe(true);
    expect(el.classList.contains("ann-fx-rainbow")).toBe(true);
  });

  it("accent rỗng → tháo sạch, không add gì", () => {
    const doc = setupDoc();
    const el = doc.querySelector<HTMLElement>("[data-preview-marquee-text]")!;
    applyFxToEl(el, { accentClass: "text-vapor-pink", fxClass: "ann-fx-blink" });
    applyFxToEl(el, { accentClass: "", fxClass: "" });
    expect(el.className).toBe("");
  });
});

describe("ANNOUNCE.FX — readFxControls", () => {
  it("đọc giá trị 3 control", () => {
    const doc = setupDoc();
    expect(readFxControls(doc)).toEqual({ accent: "", fx: "none", icon: "auto" });
    (doc.getElementById("ann-accent") as HTMLSelectElement).value = "pink";
    (doc.getElementById("ann-fx") as HTMLSelectElement).value = "neon";
    (doc.querySelector('input[name="icon"][value="party"]') as HTMLInputElement).checked = true;
    (doc.querySelector('input[name="icon"][value="auto"]') as HTMLInputElement).checked = false;
    expect(readFxControls(doc)).toEqual({ accent: "pink", fx: "neon", icon: "party" });
  });
});

describe("ANNOUNCE.FX — applyFxToPreviews (wiring cả 3 khung)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("áp lên marquee + banner + popup; icon auto → default theo type", () => {
    const doc = setupDoc();
    applyFxToPreviews(doc);
    // mặc định: không accent/fx
    const mq = doc.querySelector<HTMLElement>("[data-preview-marquee-text]")!;
    expect(mq.classList.contains("text-vapor-pink")).toBe(false);
    // chọn pink + neon + party
    (doc.getElementById("ann-accent") as HTMLSelectElement).value = "pink";
    (doc.getElementById("ann-fx") as HTMLSelectElement).value = "neon";
    (doc.querySelector('input[name="icon"][value="party"]') as HTMLInputElement).checked = true;
    (doc.querySelector('input[name="icon"][value="auto"]') as HTMLInputElement).checked = false;
    applyFxToPreviews(doc);
    expect(mq.classList.contains("text-vapor-pink")).toBe(true);
    expect(mq.classList.contains("ann-fx-neon")).toBe(true);
    const bt = doc.querySelector<HTMLElement>("[data-preview-banner-title]")!;
    expect(bt.classList.contains("text-vapor-pink")).toBe(true);
    const slot = bt.querySelector<HTMLElement>("[data-fx-icon]");
    expect(slot?.textContent).toBe("🎉");
    const pi = doc.querySelector<HTMLElement>("[data-preview-popup-icon]")!;
    expect(pi.textContent).toBe("🎉");
  });

  it("icon auto → icon default từ data-icon-default của ann-type", () => {
    const doc = setupDoc();
    (doc.getElementById("ann-type") as HTMLSelectElement).setAttribute("data-icon-default", "📢");
    applyFxToPreviews(doc);
    const pi = doc.querySelector<HTMLElement>("[data-preview-popup-icon]")!;
    expect(pi.textContent).toBe("📢");
  });

  it("initAnnouncementPreview đổi type cũng áp lại FX", () => {
    const doc = setupDoc();
    const cleanup = initAnnouncementPreview(doc);
    try {
      (doc.getElementById("ann-accent") as HTMLSelectElement).value = "green";
      (doc.getElementById("ann-fx") as HTMLSelectElement).value = "rainbow";
      const ev = new Event("change");
      doc.getElementById("ann-accent")!.dispatchEvent(ev);
      const mq = doc.querySelector<HTMLElement>("[data-preview-marquee-text]")!;
      expect(mq.classList.contains("text-vapor-green")).toBe(true);
      expect(mq.classList.contains("ann-fx-rainbow")).toBe(true);
    } finally {
      cleanup();
    }
  });
});

describe("re-export từ announcementPreview (không regression)", () => {
  it("typeLabel/popupIconFor/marqueePreviewText vẫn hoạt động", () => {
    expect(typeLabel("banner")).toContain("BANNER");
    expect(popupIconFor("triển lãm mới")).toBe("🖼️");
    expect(marqueePreviewText("T", "")).toBe("[THÔNG BÁO] T");
  });
});
