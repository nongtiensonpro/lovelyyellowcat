import React, { useState, useRef, useEffect } from "react";
import { parseMarkdownToHtml } from "../lib/markdown";

interface Article {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body_md: string;
  cover_url: string;
  status: "draft" | "published";
  tags: string[];
}

interface ArticleEditorProps {
  initialArticle?: Article;
}

type BlockStyle = "paragraph" | "h1" | "h2" | "h3" | "quote" | "code";

// Chuyển đổi tiêu đề thành Slug URL
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9 -]/g, "") // Xóa ký tự đặc biệt
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng -
    .replace(/-+/g, "-") // Xóa các dấu - thừa
    .replace(/^-+/, "") // Cắt dấu - ở đầu
    .replace(/-+$/, ""); // Cắt dấu - ở cuối
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ initialArticle }) => {
  const [id] = useState(initialArticle?.id || "");
  const [title, setTitle] = useState(initialArticle?.title || "");
  const [slug, setSlug] = useState(initialArticle?.slug || "");
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt || "");
  const [bodyMd, setBodyMd] = useState(initialArticle?.body_md || "");
  const [coverUrl, setCoverUrl] = useState(initialArticle?.cover_url || "");
  const [status, setStatus] = useState<"draft" | "published">(initialArticle?.status || "draft");
  const [tagsInput, setTagsInput] = useState(initialArticle?.tags.join(", ") || "");

  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tự động tạo slug khi viết Title (chỉ khi đang tạo mới)
  useEffect(() => {
    if (!id) {
      setSlug(slugify(title));
    }
  }, [title, id]);

  const focusEditor = (selectionStart: number, selectionEnd = selectionStart) => {
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
    }, 0);
  };

  const replaceSelection = (replacement: string, selectStartOffset?: number, selectEndOffset?: number) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? bodyMd.length;
    const end = textarea?.selectionEnd ?? bodyMd.length;
    const nextBody = bodyMd.slice(0, start) + replacement + bodyMd.slice(end);

    setBodyMd(nextBody);

    const nextStart = start + (selectStartOffset ?? replacement.length);
    const nextEnd = start + (selectEndOffset ?? selectStartOffset ?? replacement.length);
    focusEditor(nextStart, nextEnd);
  };

  const wrapSelection = (prefix: string, suffix: string, fallback: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? bodyMd.length;
    const end = textarea?.selectionEnd ?? bodyMd.length;
    const selected = bodyMd.slice(start, end);
    const inner = selected || fallback;

    replaceSelection(`${prefix}${inner}${suffix}`, prefix.length, prefix.length + inner.length);
  };

  const applyLinePrefix = (prefix: string, fallback: string, stripPattern?: RegExp) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? bodyMd.length;
    const end = textarea?.selectionEnd ?? bodyMd.length;
    const selected = bodyMd.slice(start, end);
    const source = selected || fallback;
    const lines = source.split("\n");
    const formatted = lines
      .map((line) => `${prefix}${stripPattern ? line.replace(stripPattern, "") : line}`)
      .join("\n");

    replaceSelection(formatted, selected ? 0 : prefix.length, formatted.length);
  };

  const applyBlockStyle = (style: BlockStyle) => {
    if (style === "paragraph") {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? bodyMd.length;
      const end = textarea?.selectionEnd ?? bodyMd.length;
      const selected = bodyMd.slice(start, end);
      const cleaned = (selected || "Đoạn văn mới").replace(/^(#{1,6}\s+|>\s+|- |\d+\.\s+)/gm, "");
      replaceSelection(cleaned, 0, cleaned.length);
      return;
    }

    if (style === "code") {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? bodyMd.length;
      const end = textarea?.selectionEnd ?? bodyMd.length;
      const selected = bodyMd.slice(start, end) || "Dán đoạn mã hoặc ghi chú kỹ thuật tại đây";
      const block = `\n\`\`\`\n${selected}\n\`\`\`\n`;
      replaceSelection(block, 5, 5 + selected.length);
      return;
    }

    const prefixes: Record<Exclude<BlockStyle, "paragraph" | "code">, string> = {
      h1: "# ",
      h2: "## ",
      h3: "### ",
      quote: "> ",
    };

    const fallbacks: Record<Exclude<BlockStyle, "paragraph" | "code">, string> = {
      h1: "Tiêu đề lớn",
      h2: "Tiêu đề phụ",
      h3: "Tiêu đề nhỏ",
      quote: "Trích dẫn nổi bật",
    };

    applyLinePrefix(prefixes[style], fallbacks[style], /^(#{1,6}\s+|>\s+)/);
  };

  const insertLink = () => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? bodyMd.length;
    const end = textarea?.selectionEnd ?? bodyMd.length;
    const selected = bodyMd.slice(start, end) || "Tên liên kết";
    const url = window.prompt("Dán URL liên kết", "https://");
    if (!url) return;

    const markdown = `[${selected}](${url})`;
    replaceSelection(markdown, 1, 1 + selected.length);
  };

  const insertImageFromUrl = () => {
    const imageUrl = window.prompt("Dán URL ảnh", "https://");
    if (!imageUrl) return;
    const altText = window.prompt("Mô tả ngắn cho ảnh", "Ảnh minh họa") || "Ảnh minh họa";
    const markdown = `\n![${altText}](${imageUrl})\n`;
    replaceSelection(markdown, 3, 3 + altText.length);
  };

  const insertList = (ordered: boolean) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? bodyMd.length;
    const end = textarea?.selectionEnd ?? bodyMd.length;
    const selected = bodyMd.slice(start, end);
    const source = selected || "Ý chính thứ nhất\nÝ chính thứ hai";
    const formatted = source
      .split("\n")
      .map((line, index) => `${ordered ? `${index + 1}.` : "-"} ${line.replace(/^(- |\d+\.\s+)/, "")}`)
      .join("\n");

    replaceSelection(formatted, selected ? 0 : ordered ? 3 : 2, formatted.length);
  };

  const insertTable = () => {
    const table = "\n| Cột 1 | Cột 2 | Cột 3 |\n| --- | --- | --- |\n| Nội dung | Nội dung | Nội dung |\n";
    replaceSelection(table, 3, 8);
  };

  const insertDivider = () => {
    replaceSelection("\n\n---\n\n");
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      wrapSelection("**", "**", "chữ đậm");
    } else if (key === "i") {
      event.preventDefault();
      wrapSelection("*", "*", "chữ nghiêng");
    } else if (key === "k") {
      event.preventDefault();
      insertLink();
    }
  };

  // Hành động upload ảnh minh họa
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: "cover" | "body") => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Không thể tải ảnh lên.");
      }

      const responseData = await response.json();
      const secureUrl = responseData.secure_url;

      if (target === "cover") {
        setCoverUrl(secureUrl);
      } else {
        replaceSelection(`\n![Vapor Art](${secureUrl})\n`);
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi tải ảnh lên Cloudinary.");
    } finally {
      setIsUploading(false);
    }
  };

  // Lưu bài viết
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !bodyMd.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập đầy đủ các trường Tiêu đề, Slug và Nội dung bài viết." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const tagsArray = tagsInput
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id || undefined,
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim(),
          body_md: bodyMd.trim(),
          cover_url: coverUrl.trim(),
          status,
          tags: tagsArray
        })
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "Gặp sự cố khi lưu bài viết.");
      }

      setMessage({ type: "success", text: id ? "BÀI VIẾT ĐÃ ĐƯỢC CẬP NHẬT THÀNH CÔNG!" : "BÀI VIẾT MỚI ĐÃ ĐƯỢC KHỞI TẠO THÀNH CÔNG!" });
      if (!id) {
        // Nếu tạo mới thành công, chuyển hướng về dashboard sau 1.5s
        setTimeout(() => {
          window.location.href = "/admin";
        }, 1500);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const wordCount = bodyMd.trim() ? bodyMd.trim().split(/\s+/).length : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div className="grid lg:grid-cols-12 gap-8 font-retro text-black">
      {/* Cột trái: Form Nhập liệu (7 cols) */}
      <form onSubmit={handleSave} className="lg:col-span-7 win95-container flex flex-col bg-win-gray">
        <div className="win95-header">
          <span>{id ? "EDIT_ARTICLE.EXE" : "NEW_ARTICLE.EXE"}</span>
          <span className="text-[10px] text-vapor-yellow">{status === "published" ? "✦ PUBLISHED" : "⏳ DRAFT"}</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Thông báo */}
          {message && (
            <div className={`p-3 border-2 ${
              message.type === "success" 
                ? "bg-green-100 text-green-900 border-green-400" 
                : "bg-red-100 text-red-900 border-red-400"
            }`}>
              <div className="font-bold flex items-center gap-2">
                <span>{message.type === "success" ? "💾" : "⚠️"}</span>
                <span>{message.text}</span>
              </div>
            </div>
          )}

          {/* Tiêu đề */}
          <div className="flex flex-col">
            <label className="text-xs font-bold mb-1 uppercase">Tiêu đề bài viết (*)</label>
            <input
              type="text"
              required
              className="p-2 border border-win-dark bg-white outline-none text-xs shadow-inner"
              placeholder="VD: Bản Giao Hưởng Của Những Tín Hiệu Sóng Analog"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Slug & Cover Upload */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-bold mb-1 uppercase">Slug bài viết (*)</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  required
                  className="flex-1 p-2 border border-win-dark bg-white outline-none text-xs font-mono shadow-inner"
                  placeholder="ban-giao-huong-analog"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                />
                <button
                  type="button"
                  onClick={() => setSlug(slugify(title))}
                  className="win95-btn text-[10px] font-bold"
                >
                  Tạo lại
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold mb-1 uppercase">Ảnh bìa (Cover URL)</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  className="flex-1 p-2 border border-win-dark bg-white outline-none text-xs font-mono shadow-inner"
                  placeholder="https://images.cloudinary.com/..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "cover")}
                  className="hidden"
                  id="cover-file-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="cover-file-upload"
                  className="win95-btn text-[10px] font-bold cursor-pointer py-1.5 px-2 text-center"
                >
                  {isUploading ? "..." : "Tải ảnh"}
                </label>
              </div>
            </div>
          </div>

          {/* Xem trước ảnh bìa */}
          {coverUrl && (
            <div className="border border-win-dark p-1 bg-white inline-block">
              <img src={coverUrl} alt="Cover Preview" className="h-20 object-cover border border-win-dark" />
            </div>
          )}

          {/* Excerpt */}
          <div className="flex flex-col">
            <label className="text-xs font-bold mb-1 uppercase">Mô tả ngắn (Excerpt)</label>
            <textarea
              rows={2}
              className="p-2 border border-win-dark bg-white outline-none text-xs shadow-inner"
              placeholder="Nhập tóm tắt sơ lược bài viết nghệ thuật..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>

          {/* Tags & Status */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-xs font-bold mb-1 uppercase">Từ khóa (Tags - ngăn cách bằng dấu phẩy)</label>
              <input
                type="text"
                className="p-2 border border-win-dark bg-white outline-none text-xs shadow-inner"
                placeholder="VD: vaporwave, retro, classic, 90s"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold mb-1 uppercase">Trạng thái xuất bản</label>
              <select
                className="p-2 border border-win-dark bg-white outline-none text-xs font-retro shadow-inner h-[34px]"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              >
                <option value="draft">⏳ LƯU NHÁP (DRAFT.SYS)</option>
                <option value="published">🚀 XUẤT BẢN (PUBLISHED.EXE)</option>
              </select>
            </div>
          </div>

          {/* Trình soạn thảo văn bản */}
          <div className="flex flex-col">
            <div className="flex flex-col gap-2 mb-1">
              <div className="flex justify-between items-center gap-2">
                <label className="text-xs font-bold uppercase">Nội dung bài viết (*)</label>
                <div className="flex border border-win-dark bg-[#d4d4d4] p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("write")}
                    className={`win95-btn text-[9px] font-bold px-2 py-0.5 ${activeTab === "write" ? "bg-white shadow-inner" : ""}`}
                  >
                    SOẠN THẢO
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`win95-btn text-[9px] font-bold px-2 py-0.5 ${activeTab === "preview" ? "bg-white shadow-inner" : ""}`}
                  >
                    XEM TRƯỚC
                  </button>
                </div>
              </div>

              <div className="border-2 border-win-dark bg-[#d4d4d4]">
                <div className="flex flex-wrap items-center gap-1 border-b border-win-dark p-1 bg-win-gray">
                  <select
                    className="border border-win-dark bg-white text-black text-[10px] font-bold h-8 px-2 min-w-32"
                    defaultValue="paragraph"
                    onChange={(event) => {
                      applyBlockStyle(event.target.value as BlockStyle);
                      event.currentTarget.value = "paragraph";
                    }}
                    title="Kiểu đoạn"
                  >
                    <option value="paragraph">Đoạn văn</option>
                    <option value="h1">Tiêu đề 1</option>
                    <option value="h2">Tiêu đề 2</option>
                    <option value="h3">Tiêu đề 3</option>
                    <option value="quote">Trích dẫn</option>
                    <option value="code">Khối mã</option>
                  </select>

                  <button type="button" onClick={() => wrapSelection("**", "**", "chữ đậm")} className="win95-btn w-8 h-8 font-black text-sm" title="In đậm">B</button>
                  <button type="button" onClick={() => wrapSelection("*", "*", "chữ nghiêng")} className="win95-btn w-8 h-8 italic font-bold text-sm" title="In nghiêng">I</button>
                  <button type="button" onClick={() => wrapSelection("`", "`", "mã")} className="win95-btn w-8 h-8 font-mono font-bold text-xs" title="Mã trong dòng">{"<>"}</button>
                  <button type="button" onClick={insertLink} className="win95-btn h-8 px-2 text-[10px] font-bold" title="Chèn liên kết">LINK</button>
                  <button type="button" onClick={() => insertList(false)} className="win95-btn h-8 px-2 text-[10px] font-bold" title="Danh sách gạch đầu dòng">• LIST</button>
                  <button type="button" onClick={() => insertList(true)} className="win95-btn h-8 px-2 text-[10px] font-bold" title="Danh sách đánh số">1. LIST</button>
                  <button type="button" onClick={insertTable} className="win95-btn h-8 px-2 text-[10px] font-bold" title="Chèn bảng">TABLE</button>
                  <button type="button" onClick={insertDivider} className="win95-btn h-8 px-2 text-[10px] font-bold" title="Đường phân tách">HR</button>
                  <button type="button" onClick={insertImageFromUrl} className="win95-btn h-8 px-2 text-[10px] font-bold" title="Chèn ảnh bằng URL">IMG URL</button>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "body")}
                    className="hidden"
                    id="body-file-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="body-file-upload"
                    className="win95-btn h-8 px-2 text-[10px] font-bold cursor-pointer inline-flex items-center"
                    title="Tải ảnh và chèn vào bài"
                  >
                    {isUploading ? "..." : "UPLOAD IMG"}
                  </label>
                </div>

                {activeTab === "write" ? (
                  <textarea
                    ref={textareaRef}
                    rows={16}
                    required
                    className="w-full min-h-[420px] p-3 border-0 bg-white outline-none font-sans text-sm shadow-inner leading-relaxed text-black resize-y"
                    placeholder="Bắt đầu viết nội dung bài viết tại đây..."
                    value={bodyMd}
                    onChange={(e) => setBodyMd(e.target.value)}
                    onKeyDown={handleEditorKeyDown}
                  />
                ) : (
                  <div className="min-h-[420px] max-h-[620px] overflow-y-auto p-4 bg-white text-black">
                    <div
                      className="prose prose-sm font-sans"
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(bodyMd) || `<p class="text-win-dark italic text-center py-20 font-retro">Nội dung bài viết sẽ hiển thị trực quan tại đây...</p>` }}
                    />
                  </div>
                )}

                <div className="flex flex-wrap justify-between gap-2 border-t border-win-dark bg-[#c0c0c0] px-2 py-1 text-[9px] text-win-dark font-bold">
                  <span>{wordCount} từ</span>
                  <span>{readingMinutes} phút đọc</span>
                  <span>{bodyMd.length} ký tự</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nút lưu cuối cùng */}
        <div className="p-3 bg-win-gray border-t border-white flex justify-end gap-3">
          <a href="/admin" className="win95-btn no-underline text-black font-bold px-6 py-2">
            HỦY
          </a>
          <button
            type="submit"
            disabled={isSaving}
            className="win95-btn font-bold px-8 py-2 bg-win-gray border border-white text-black"
          >
            {isSaving ? "ĐANG LƯU HỆ THỐNG..." : "💾 LƯU BÀI VIẾT"}
          </button>
        </div>
      </form>

      {/* Cột phải: Live Preview (5 cols) */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        {/* Thanh chuyển Tab trên di động, hiển thị tiêu đề tab trên máy tính */}
        <div className="win95-container bg-win-gray flex flex-col flex-1">
          <div className="win95-header">
            <span>LIVE_PREVIEW.SYS</span>
            <span className="text-[10px] text-vapor-blue">PREVIEW MODE</span>
          </div>
          
          <div className="p-4 bg-white border-2 border-win-dark overflow-y-auto flex-1 min-h-[500px] max-h-[680px]">
            {/* Header bài viết xem trước */}
            {coverUrl && (
              <img 
                src={coverUrl} 
                alt="Cover" 
                className="w-full h-40 object-cover border-2 border-win-dark mb-4 filter saturate-125 hue-rotate-15"
              />
            )}
            
            <div className="mb-4">
              <h2 className="text-xl font-black text-black font-retro uppercase border-b-2 border-win-dark pb-2">
                {title || "TIÊU ĐỀ BÀI VIẾT CỦA BẠN"}
              </h2>
              <div className="flex gap-2 mt-2">
                {tagsInput.split(",").map(t => t.trim()).filter(t => t.length > 0).map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 border border-win-dark bg-[#e0e0e0] font-bold font-retro">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {excerpt && (
              <p className="text-xs text-win-dark italic border-l-2 border-win-dark pl-3 mb-6">
                {excerpt}
              </p>
            )}

            {/* Khung nội dung parse Markdown */}
            <div 
              className="prose prose-sm font-sans"
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(bodyMd) || `<p class="text-win-dark italic text-center py-20 font-retro">Nội dung bài viết sẽ hiển thị trực quan tại đây...</p>` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
