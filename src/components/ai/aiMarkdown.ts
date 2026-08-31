// aiMarkdown.ts — mini markdown cho AI reply (Phase 6, kế hoạch §6).
// SECURITY: escape HTML TRƯỚC khi format — nội dung model (BYOK, không tin cậy 100%)
// không thể inject <script>/<img onerror> qua dangerouslySetInnerHTML.

/** Escape 5 ký tự HTML nguy hiểm. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Format mini-markdown an toàn: escape rồi mới thay bold/em/code.
 * Class <code> giữ nguyên như bản cũ (bg-black/10 px-1 py-0.5 font-mono text-[11px]).
 */
export function formatAiMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="bg-black/10 px-1 py-0.5 font-mono text-[11px]">$1</code>');
}

/** Cắt text cho preview (title session...) — 1 dòng, max chars, có dấu … khi cắt. */
export function truncateOneLine(text: string, maxChars: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxChars) return oneLine;
  return oneLine.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "\u2026";
}
