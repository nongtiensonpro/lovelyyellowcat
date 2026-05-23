// Hàm phân tích cú pháp Markdown sang HTML siêu nhẹ, chạy hoàn hảo ở cả Server-side (Astro) và Client-side (React)
function parseTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;

  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function isTableDivider(cells: string[]) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderMarkdownTables(input: string): string {
  const lines = input.split("\n");
  const output: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headerCells = parseTableRow(lines[index]);
    const dividerCells = index + 1 < lines.length ? parseTableRow(lines[index + 1]) : null;

    if (headerCells && dividerCells && isTableDivider(dividerCells)) {
      const bodyRows: string[][] = [];
      index += 2;

      while (index < lines.length) {
        const rowCells = parseTableRow(lines[index]);
        if (!rowCells) {
          index -= 1;
          break;
        }

        bodyRows.push(rowCells);
        index += 1;
      }

      output.push(
        `<div class="overflow-x-auto my-4"><table class="w-full border-collapse border-2 border-win-dark text-xs"><thead><tr>${headerCells
          .map((cell) => `<th class="border border-win-dark bg-win-gray p-2 text-left font-bold">${cell}</th>`)
          .join("")}</tr></thead><tbody>${bodyRows
          .map((row) => `<tr>${row
            .map((cell) => `<td class="border border-win-dark p-2">${cell}</td>`)
            .join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
      continue;
    }

    output.push(lines[index]);
  }

  return output.join("\n");
}

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

  // Bảng đơn giản kiểu Markdown
  html = renderMarkdownTables(html);

  // Đường phân tách
  html = html.replace(/^\s*---+\s*$/gim, '<hr class="my-5 border-t-2 border-win-dark" />');

  // Danh sách gạch đầu dòng
  html = html.replace(/^\s*-\s+(.*)$/gim, '<li class="list-disc ml-6 my-1">$1</li>');
  html = html.replace(/^\s*\*\s+(.*)$/gim, '<li class="list-disc ml-6 my-1">$1</li>');
  html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<li class="list-decimal ml-6 my-1">$1</li>');

  // Đoạn văn thông thường (Double newlines)
  html = html.split(/\n{2,}/g).map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith("<h") || trimmed.startsWith("<pre") || trimmed.startsWith("<blockquote") || trimmed.startsWith("<li") || trimmed.startsWith("<div") || trimmed.startsWith("<hr")) {
      return p;
    }
    return `<p class="my-3 leading-relaxed text-black/85">${p.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");

  return html;
}
