import { describe, it, expect } from "vitest";
import { escapeHtml, formatAiMarkdown, truncateOneLine } from "../../src/components/ai/aiMarkdown";

describe("escapeHtml", () => {
  it("escape 5 ký tự nguy hiểm", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
  });
  it("escape ' và &", () => {
    expect(escapeHtml(`<'&'>`)).toBe("&lt;&#39;&amp;&#39;&gt;");
  });
});

describe("formatAiMarkdown", () => {
  it("bold/em/code hoạt động", () => {
    expect(formatAiMarkdown("**bold**")).toContain("<strong>bold</strong>");
    expect(formatAiMarkdown("*em*")).toContain("<em>em</em>");
    expect(formatAiMarkdown("`code`")).toContain("<code class=");
  });
  it("XSS bị vô hiệu: script tag thành text", () => {
    const r = formatAiMarkdown("hello <script>alert(1)</script> world");
    expect(r).not.toContain("<script>");
    expect(r).toContain("&lt;script&gt;");
  });
  it("img onerror bị vô hiệu", () => {
    const r = formatAiMarkdown(`<img src=x onerror="alert(1)">`);
    expect(r).not.toContain("<img");
    expect(r).toContain("&lt;img");
  });
  it("markdown trong text đã escape vẫn format được", () => {
    const r = formatAiMarkdown("**a & b**");
    expect(r).toContain("<strong>a &amp; b</strong>");
  });
});

describe("truncateOneLine", () => {
  it("ngắn → nguyên văn 1 dòng", () => {
    expect(truncateOneLine("a\nb  c", 50)).toBe("a b c");
  });
  it("dài → cắt + …", () => {
    const r = truncateOneLine("x".repeat(100), 20);
    expect(r.length).toBe(20);
    expect(r.endsWith("\u2026")).toBe(true);
  });
});
