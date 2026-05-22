// Hàm phân tích cú pháp Markdown sang HTML siêu nhẹ, chạy hoàn hảo ở cả Server-side (Astro) và Client-side (React)
export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";
  let html = markdown;

  // Xử lý Escape HTML đặc biệt trước
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Khôi phục blockquote sau khi escape >
  html = html.replace(/^&gt;\s+(.*)$/gim, "<blockquote>$1</blockquote>");

  // Khung Code block
  html = html.replace(/```([\s\S]*?)```/gm, (match, code) => {
    return `<pre class="bg-black text-vapor-green p-3 font-mono text-xs overflow-x-auto border-2 border-win-dark mb-4">${code.trim()}</pre>`;
  });

  // Code inline
  html = html.replace(/`([^`]+)`/g, '<code class="bg-black text-vapor-pink px-1 font-mono text-xs border border-win-dark">$1</code>');

  // Ảnh: ![alt](url)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto border-2 border-win-dark my-4 filter saturate-125 hue-rotate-15" />');

  // Đường dẫn: [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-800 underline font-bold" target="_blank">$1</a>');

  // Tiêu đề (H1 - H6)
  html = html.replace(/^###### (.*)$/gim, '<h6 class="text-xs font-bold text-black mt-4 mb-2">$1</h6>');
  html = html.replace(/^##### (.*)$/gim, '<h5 class="text-sm font-bold text-black mt-4 mb-2">$1</h5>');
  html = html.replace(/^#### (.*)$/gim, '<h4 class="text-base font-bold text-vapor-purple mt-4 mb-2 font-retro">$1</h4>');
  html = html.replace(/^### (.*)$/gim, '<h3 class="text-lg font-bold text-vapor-blue mt-4 mb-2 font-retro">$1</h3>');
  html = html.replace(/^## (.*)$/gim, '<h2 class="text-xl font-bold text-vapor-pink mt-5 mb-3 font-retro">$1</h2>');
  html = html.replace(/^# (.*)$/gim, '<h1 class="text-2xl font-black text-black mt-6 mb-4 font-retro uppercase border-b border-win-dark pb-1">$1</h1>');

  // Định dạng chữ đậm nhạt
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Danh sách gạch đầu dòng
  html = html.replace(/^\s*-\s+(.*)$/gim, '<li class="list-disc ml-6 my-1">$1</li>');
  html = html.replace(/^\s*\*\s+(.*)$/gim, '<li class="list-disc ml-6 my-1">$1</li>');

  // Đoạn văn thông thường (Double newlines)
  html = html.split(/\n{2,}/g).map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith("<h") || trimmed.startsWith("<pre") || trimmed.startsWith("<blockquote") || trimmed.startsWith("<li")) {
      return p;
    }
    return `<p class="my-3 leading-relaxed text-black/85">${p.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return html;
}
