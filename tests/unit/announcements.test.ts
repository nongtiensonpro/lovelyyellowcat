// announcements.test.ts — pure logic cho hệ thống Thông Báo (WinPopup Station).
import { describe, expect, it } from "vitest";
import {
  normalizeType,
  isExpired,
  filterLive,
  partitionByType,
  marqueeTextFrom,
  dismissKey,
  safeIdToken,
  type AnnouncementLike,
} from "../../src/lib/announcementUtils";

const mk = (over: Partial<AnnouncementLike>): AnnouncementLike => ({
  id: "a1",
  title: "Tiêu đề",
  type: "banner",
  is_active: true,
  end_at: "2099-01-01T00:00:00Z",
  created_at: "2026-08-01T00:00:00Z",
  ...over,
});

describe("normalizeType", () => {
  it("nhận 3 loại hợp lệ và loại giá trị lạ", () => {
    expect(normalizeType("banner")).toBe("banner");
    expect(normalizeType("marquee")).toBe("marquee");
    expect(normalizeType("popup")).toBe("popup");
    expect(normalizeType("weird")).toBeNull();
    expect(normalizeType(null)).toBeNull();
  });
});

describe("isExpired", () => {
  it("end_at quá khứ = hết hạn, tương lai = chưa", () => {
    expect(isExpired("2000-01-01T00:00:00Z", new Date("2026-09-01T00:00:00Z"))).toBe(true);
    expect(isExpired("2099-01-01T00:00:00Z", new Date("2026-09-01T00:00:00Z"))).toBe(false);
  });
  it("null / date rác = không hết hạn (fail-open)", () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired("not-a-date")).toBe(false);
  });
});

describe("filterLive", () => {
  it("chỉ giữ active + đúng type + chưa hết hạn", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    const rows = [
      mk({ id: "ok" }),
      mk({ id: "inactive", is_active: false }),
      mk({ id: "expired", end_at: "2000-01-01T00:00:00Z" }),
      mk({ id: "badtype", type: "weird" }),
    ];
    const live = filterLive(rows, now);
    expect(live.map((a) => a.id)).toEqual(["ok"]);
  });
});

describe("partitionByType", () => {
  it("chia đúng 3 loại, mỗi loại lấy mới nhất, popup chỉ 1", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    const rows = [
      mk({ id: "pop2", type: "popup", created_at: "2026-08-02T00:00:00Z" }),
      mk({ id: "pop1", type: "popup", created_at: "2026-08-01T00:00:00Z" }),
      mk({ id: "mq1", type: "marquee" }),
      mk({ id: "bn1", type: "banner" }),
    ];
    const p = partitionByType(rows, now);
    expect(p.popup?.id).toBe("pop2"); // mới nhất trước
    expect(p.marquee?.id).toBe("mq1");
    expect(p.banner?.id).toBe("bn1");
  });
  it("thiếu loại nào → null loại đó", () => {
    const p = partitionByType([mk({ id: "only", type: "popup" })]);
    expect(p.popup?.id).toBe("only");
    expect(p.marquee).toBeNull();
    expect(p.banner).toBeNull();
  });
});

describe("marqueeTextFrom", () => {
  it("gồm prefix + title, có body nối bằng em-dash", () => {
    expect(marqueeTextFrom(mk({ title: "Triển lãm mở cửa" }))).toBe("[THÔNG BÁO] Triển lãm mở cửa");
    expect(marqueeTextFrom(mk({ title: "Triển lãm", body: "Sảnh A" }))).toBe(
      "[THÔNG BÁO] Triển lãm — Sảnh A",
    );
  });
});

describe("dismissKey / safeIdToken", () => {
  it("key có prefix ổn định", () => {
    expect(dismissKey("abc")).toBe("lyc_ann_dismissed_abc");
  });
  it("safeIdToken chỉ giữ ký tự an toàn", () => {
    expect(safeIdToken('ab<script>"x"')).toBe("abscriptx");
    expect(safeIdToken("uuid-123_ABC")).toBe("uuid-123_ABC");
  });
});
