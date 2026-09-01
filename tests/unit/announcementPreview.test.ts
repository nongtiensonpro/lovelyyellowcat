// @vitest-environment jsdom
// announcementPreview.test.ts — logic PREVIEW.ALL trong trang admin.
// DOM mô phỏng đúng cấu trúc markup trong announcements.astro.
import { describe, expect, it } from "vitest";
import {
  initAnnouncementPreview,
  marqueePreviewText,
  typeLabel,
  popupIconFor,
  PREVIEW_PLACEHOLDER,
} from "../../src/lib/announcementPreview";

function buildDoc() {
  document.body.innerHTML = `<!doctype html><html><body>
    <input id="ann-title" />
    <textarea id="ann-body"></textarea>
    <select id="ann-type">
      <option value="marquee" selected>Marquee</option>
      <option value="banner">Banner</option>
      <option value="popup">Popup</option>
    </select>
    <div data-preview-type="marquee">
      <span data-selected-badge class="hidden">✔</span>
      <span data-preview-marquee-text></span>
      <span data-preview-marquee-text-2></span>
    </div>
    <div data-preview-type="banner">
      <span data-selected-badge class="hidden">✔</span>
      <p data-preview-banner-title></p>
    </div>
    <div data-preview-type="popup">
      <span data-selected-badge class="hidden">✔</span>
      <p data-preview-popup-title></p>
      <span data-preview-popup-icon></span>
      <div data-preview-popup-body-wrap class="hidden"><p data-preview-popup-body></p></div>
    </div>
    <span id="ann-preview-active-label"></span>
  </body></html>`;
  return { doc: document, win: window };
}

describe("pure helpers", () => {
  it("marqueePreviewText: có prefix, nối body bằng em-dash", () => {
    expect(marqueePreviewText("Triển lãm mở", "")).toBe("[THÔNG BÁO] Triển lãm mở");
    expect(marqueePreviewText("Triển lãm", "Sảnh A")).toBe("[THÔNG BÁO] Triển lãm — Sảnh A");
  });
  it("marqueePreviewText: title rỗng → placeholder", () => {
    expect(marqueePreviewText("   ", "x")).toBe("[THÔNG BÁO] (nhập tiêu đề để xem trước...)");
  });
  it("typeLabel: 3 nhãn + fallback uppercase", () => {
    expect(typeLabel("marquee")).toBe("🎞️ MARQUEE");
    expect(typeLabel("banner")).toBe("🚩 BANNER");
    expect(typeLabel("popup")).toBe("🪟 POPUP");
    expect(typeLabel("junk")).toBe("JUNK");
  });
  it("popupIconFor: đổi icon theo từ khoá triển lãm", () => {
    expect(popupIconFor("Triển lãm Mùa Hè")).toBe("🖼️");
    expect(popupIconFor("gallery mở cửa")).toBe("🖼️");
    expect(popupIconFor("Bảo trì hệ thống")).toBe("📣");
  });
});

describe("initAnnouncementPreview (jsdom wiring)", () => {
  it("khởi tạo: text cập nhật ngay, đúng 1 khung active theo select hiện tại", () => {
    const { doc } = buildDoc();
    const cleanup = initAnnouncementPreview(doc);
    const [mq, bn, pp] = [
      doc.querySelector('[data-preview-type="marquee"]')!,
      doc.querySelector('[data-preview-type="banner"]')!,
      doc.querySelector('[data-preview-type="popup"]')!,
    ];
    expect(mq.classList.contains("ann-preview-active")).toBe(true);
    expect(bn.classList.contains("ann-preview-active")).toBe(false);
    expect(pp.classList.contains("ann-preview-active")).toBe(false);
    expect(mq.querySelector("[data-selected-badge]")!.classList.contains("hidden")).toBe(false);
    expect(bn.querySelector("[data-selected-badge]")!.classList.contains("hidden")).toBe(true);
    expect(doc.getElementById("ann-preview-active-label")!.textContent).toContain("MARQUEE");
    cleanup();
  });

  it("đổi type select → highlight chuyển khung + label đổi", () => {
    const { doc, win } = buildDoc();
    const cleanup = initAnnouncementPreview(doc);
    const sel = doc.getElementById("ann-type") as HTMLSelectElement;
    sel.value = "popup";
    sel.dispatchEvent(new win.Event("change", { bubbles: true }));
    expect(
      doc.querySelector('[data-preview-type="popup"]')!.classList.contains("ann-preview-active"),
    ).toBe(true);
    expect(
      doc.querySelector('[data-preview-type="marquee"]')!.classList.contains("ann-preview-active"),
    ).toBe(false);
    expect(doc.getElementById("ann-preview-active-label")!.textContent).toContain("POPUP");
    cleanup();
  });

  it("gõ title + body: cả 3 khung nhận text, popup hiện body", () => {
    const { doc, win } = buildDoc();
    const cleanup = initAnnouncementPreview(doc);
    const title = doc.getElementById("ann-title") as HTMLInputElement;
    const body = doc.getElementById("ann-body") as HTMLTextAreaElement;
    title.value = "Triển lãm Mùa Hè Neon";
    body.value = "Mở cửa đến 30/09";
    title.dispatchEvent(new win.Event("input", { bubbles: true }));
    body.dispatchEvent(new win.Event("input", { bubbles: true }));
    const expected = "[THÔNG BÁO] Triển lãm Mùa Hè Neon — Mở cửa đến 30/09";
    expect(doc.querySelector("[data-preview-marquee-text]")!.textContent).toBe(expected);
    expect(doc.querySelector("[data-preview-marquee-text-2]")!.textContent).toBe(expected);
    expect(doc.querySelector("[data-preview-banner-title]")!.textContent).toBe(
      "Triển lãm Mùa Hè Neon",
    );
    expect(doc.querySelector("[data-preview-popup-title]")!.textContent).toBe(
      "Triển lãm Mùa Hè Neon",
    );
    expect(doc.querySelector("[data-preview-popup-icon]")!.textContent).toBe("🖼️");
    const wrap = doc.querySelector("[data-preview-popup-body-wrap]")!;
    expect(wrap.classList.contains("hidden")).toBe(false);
    expect(doc.querySelector("[data-preview-popup-body]")!.textContent).toBe("Mở cửa đến 30/09");
    cleanup();
  });

  it("xoá body → popup ẩn lại body", () => {
    const { doc, win } = buildDoc();
    const cleanup = initAnnouncementPreview(doc);
    const body = doc.getElementById("ann-body") as HTMLTextAreaElement;
    body.value = "tạm";
    body.dispatchEvent(new win.Event("input", { bubbles: true }));
    expect(doc.querySelector("[data-preview-popup-body-wrap]")!.classList.contains("hidden")).toBe(
      false,
    );
    body.value = "";
    body.dispatchEvent(new win.Event("input", { bubbles: true }));
    expect(doc.querySelector("[data-preview-popup-body-wrap]")!.classList.contains("hidden")).toBe(
      true,
    );
    cleanup();
  });

  it("title rỗng → banner/popup hiện placeholder, marquee giữ prefix", () => {
    const { doc, win } = buildDoc();
    const cleanup = initAnnouncementPreview(doc);
    const title = doc.getElementById("ann-title") as HTMLInputElement;
    title.value = "";
    title.dispatchEvent(new win.Event("input", { bubbles: true }));
    expect(doc.querySelector("[data-preview-banner-title]")!.textContent).toBe(PREVIEW_PLACEHOLDER);
    expect(doc.querySelector("[data-preview-popup-title]")!.textContent).toBe(PREVIEW_PLACEHOLDER);
    expect(doc.querySelector("[data-preview-marquee-text]")!.textContent).toBe(
      "[THÔNG BÁO] (nhập tiêu đề để xem trước...)",
    );
    cleanup();
  });
});
