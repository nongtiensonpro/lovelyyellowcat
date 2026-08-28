/**
 * Knowledge base chính thức của Lovely Yellow Cat.
 *
 * Mục tiêu của module này là cho AI một nguồn ngữ cảnh nhỏ, ổn định và có thể
 * truy xuất theo câu hỏi. Không đưa dữ liệu riêng tư hoặc danh sách động vào
 * đây; những dữ liệu đó phải được lấy từ API công khai tương ứng khi cần.
 */

export interface SiteKnowledgeEntry {
  id: string;
  title: string;
  route?: string;
  keywords: string[];
  content: string;
}

export type KnowledgeQuery = string | Array<{ role?: string; content?: string }>;

export const SITE_KNOWLEDGE_VERSION = "2026.08";

export const SITE_KNOWLEDGE_CORE = `
ĐÂY LÀ NGỮ CẢNH CHÍNH THỨC CỦA WEBSITE LOVELY YELLOW CAT — VERSION ${SITE_KNOWLEDGE_VERSION}

NHẬN DIỆN WEBSITE
- Lovely Yellow Cat (còn gọi là LovelyYellowCat, Yellow Cat, Vapor Journal) là một tạp chí nghệ thuật số và cộng đồng triển lãm trực tuyến phi thương mại.
- Chủ đề trung tâm: Vaporwave, Synthwave, Cyberpunk, retro-computing, Windows 95/98, CRT, VHS, pixel art, City Pop và văn hóa Internet hoài cổ.
- Tinh thần hình ảnh: một “cybernetic oasis” chạy trong chiếc máy tính tưởng tượng năm 1995; giao diện lấy cảm hứng từ Windows 95/98, CRT, neon pastel và glitch.
- Website có mã nguồn mở theo giấy phép MIT tại https://github.com/nongtiensonpro/lovelyyellowcat. Liên hệ kỹ thuật/bản quyền: nongtiensonpro@gmail.com.
- Đây không phải cửa hàng, sàn giao dịch, dịch vụ đầu tư hay nền tảng bán tranh. Website không thu phí người dùng và hoạt động theo định hướng phi thương mại.

ĐIỀU HƯỚNG CÔNG KHAI
- / — Trang chủ: giới thiệu dự án, bài viết mới/chọn lọc, tác phẩm nổi bật và các lối vào chính.
- /gallery — Community Gallery: chỉ hiển thị tác phẩm cộng đồng đã được duyệt; có tìm kiếm, lọc nhãn, sắp xếp và các chế độ xem.
- /gallery/:id — trang/lightbox chi tiết của một tác phẩm trong gallery.
- /artists — Aesthetic Creators: danh bạ nghệ sĩ đang hoạt động, hồ sơ và thống kê đóng góp công khai.
- /articles/:slug — bài viết của Vapor Journal, trình bày trong giao diện WordPad; có thể bình luận, reaction, chia sẻ và bookmark.
- /submit — gửi tác phẩm mới vào hàng đợi duyệt; yêu cầu đăng nhập, tải ảnh lên Cloudinary và xác minh reCAPTCHA.
- /favorites — kho riêng các tác phẩm người dùng đã thả tim/lưu yêu thích; yêu cầu đăng nhập.
- /bookmarks — kho riêng các bài viết đã đánh dấu đọc sau; yêu cầu đăng nhập.
- /profile/:userId — hồ sơ công khai và bộ sưu tập tác phẩm của một thành viên.
- /profile/edit — chỉnh sửa hồ sơ của chính người dùng.
- /ai — Trạm CAT_AI, nơi trò chuyện với bốn persona AI.
- /ai-security — giải thích cơ chế mã hóa và lưu trữ hội thoại AI.
- /about — bản đồ hệ thống, triết lý dự án, công nghệ và các khu vực trải nghiệm.
- /terms — điều khoản dịch vụ, chính sách phi thương mại, bản quyền, nội dung người dùng và AI E2EE.
- Ô tìm kiếm nhanh trên header có thể tìm bài viết đã xuất bản, tác phẩm đã duyệt và hồ sơ nghệ sĩ công khai.

NGUYÊN TẮC TRẢ LỜI
- Khi người dùng hỏi về website, ưu tiên thông tin trong ngữ cảnh này và đưa đường dẫn chính xác dạng /route.
- Không bịa tên bài viết, tên nghệ sĩ, số lượng tác phẩm, trạng thái duyệt hoặc số liệu hiện tại. Các dữ liệu đó thay đổi theo database; hãy nói rõ là dữ liệu động và hướng người dùng tới trang phù hợp.
- Phân biệt “Yêu thích/Favorites” (tác phẩm) với “Bookmark/Saved Articles” (bài viết).
- /submit là gửi để chờ quản trị viên duyệt, không có nghĩa tác phẩm được xuất bản ngay.
- Nếu câu hỏi không liên quan website, vẫn hỗ trợ bình thường nhưng không được trình bày suy đoán về website như sự thật.
`;

export const SITE_KNOWLEDGE_ENTRIES: SiteKnowledgeEntry[] = [
  {
    id: "identity-navigation",
    title: "Website là gì và đi đâu để làm gì",
    keywords: ["lovely yellow cat", "lovelyyellowcat", "website", "trang web", "trang chủ", "điều hướng", "link", "đường dẫn", "about"],
    content: `Lovely Yellow Cat là tạp chí nghệ thuật số Vaporwave và cộng đồng triển lãm phi thương mại. Người mới nên bắt đầu ở / để xem tổng quan, /gallery để xem tranh, /artists để tìm nghệ sĩ, mở khu vực Journal trên trang chủ để đọc bài và /ai để trò chuyện với CAT_AI.`,
  },
  {
    id: "gallery",
    title: "Community Gallery và tác phẩm cộng đồng",
    route: "/gallery",
    keywords: ["gallery", "triển lãm", "tranh", "tác phẩm", "xem tranh", "lọc", "tag", "nhãn", "crt", "vhs", "gameboy", "cyberpunk", "pc-98"],
    content: ` /gallery là phòng triển lãm cộng đồng. Chỉ tác phẩm có status approved mới xuất hiện công khai. Người xem có thể tìm theo tên tranh/nghệ sĩ/mô tả, lọc theo tag, sắp xếp Mới Nhất / Yêu Thích / Ngẫu Nhiên, chuyển giữa Lưới / Chi Tiết / CRT TV và mở lightbox tại /gallery/:id.`,
  },
  {
    id: "journal",
    title: "Vapor Journal và bài viết",
    route: "/#journal",
    keywords: ["journal", "vapor journal", "bài viết", "bài báo", "đọc", "wordpad", "article", "rss", "bookmark", "lưu bài"],
    content: `Bài viết được xuất bản trong khu vực Vapor Journal, tập trung vào thẩm mỹ số, retro-computing, Vaporwave, Synthwave và văn hóa Internet. Mỗi bài có URL /articles/:slug; người dùng có thể đọc, bình luận, reaction, chia sẻ và bookmark để xem lại ở /bookmarks. Danh sách bài và tên bài hiện tại là dữ liệu động, không được tự đoán.`,
  },
  {
    id: "artists-profiles",
    title: "Nghệ sĩ và hồ sơ cộng đồng",
    route: "/artists",
    keywords: ["artist", "artists", "nghệ sĩ", "creator", "hồ sơ", "profile", "bộ sưu tập", "cyber citizen"],
    content: `/artists là danh bạ các nghệ sĩ đang hoạt động, hiển thị bio, avatar/banner, số tác phẩm, tổng reaction và ngày hoạt động gần nhất. Mỗi nghệ sĩ có hồ sơ công khai tại /profile/:userId. Không khẳng định một người là nghệ sĩ nổi bật nếu chưa có dữ liệu hiện tại từ trang.`,
  },
  {
    id: "submit-moderation",
    title: "Gửi tác phẩm và quy trình duyệt",
    route: "/submit",
    keywords: ["submit", "gửi tranh", "đăng tranh", "upload", "tải ảnh", "duyệt", "pending", "recaptcha", "cloudinary", "tag", "vaporwave", "synthwave"],
    content: `/submit yêu cầu đăng nhập Google. Quy trình gồm 3 bước: chọn tệp ảnh, nhập tiêu đề/mô tả và chọn tag, sau đó gửi duyệt. Ảnh được tải lên Cloudinary, request được bảo vệ bằng Google reCAPTCHA và bản ghi ban đầu ở trạng thái pending. Ban quản trị sẽ thẩm định; chỉ khi approved tác phẩm mới vào /gallery. Các tag hỗ trợ hiện có gồm vaporwave, synthwave, retro95, cyberpunk, vhs_glitch, roman_statue, citypop và pixel_art.`,
  },
  {
    id: "community-interactions",
    title: "Tương tác cộng đồng",
    keywords: ["favorite", "favorites", "yêu thích", "tim", "reaction", "cảm xúc", "comment", "bình luận", "reply", "trả lời", "bookmark"],
    content: `Reaction và Favorites dành cho tác phẩm trong gallery; Favorites được lưu riêng theo tài khoản và xem tại /favorites. Bookmark dành cho bài viết và xem tại /bookmarks. Bài viết có bình luận theo luồng và reaction. Các thao tác cá nhân yêu cầu đăng nhập; dữ liệu hiển thị công khai hay riêng tư phụ thuộc từng tính năng.`,
  },
  {
    id: "cat-ai",
    title: "Trạm CAT_AI và bốn persona",
    route: "/ai",
    keywords: ["ai", "cat ai", "gemini", "mèo vàng", "cybercat", "vapor", "hacker", "dj", "persona", "trò chuyện"],
    content: `/ai là Trạm CAT_AI dùng Google Gemini. Có bốn persona: Mèo Vàng Cybernetic (trợ lý website/văn hóa số), Giáo sư V.A.P.O.R (phê bình nghệ thuật), CYBER_GHOST_95 (kỹ thuật retro/Y2K) và DJ NEON PULSE (Synthwave/City Pop/thơ). Persona thay đổi giọng điệu, không thay đổi quyền truy cập dữ liệu website. AI không tự nhìn thấy database riêng tư hoặc trạng thái động nếu không được cung cấp trong ngữ cảnh.`,
  },
  {
    id: "ai-security",
    title: "Bảo mật và lịch sử hội thoại AI",
    route: "/ai-security",
    keywords: ["e2ee", "bảo mật", "mã hóa", "aes", "pbkdf2", "mật khẩu", "khóa", "key", "byok", "api key", "riêng tư"],
    content: `Trạm AI yêu cầu tài khoản hoạt động và mở khóa E2EE. Tiêu đề phiên và tin nhắn được mã hóa AES-GCM 256-bit trên trình duyệt; PBKDF2 dùng để dẫn xuất khóa. Lịch sử được lưu theo tài khoản và người dùng có thể xem, xuất hoặc xóa. Mất mật khẩu cùng khóa khôi phục có thể làm mất dữ liệu vĩnh viễn. Chế độ AI hiện gọi trực tiếp Google từ trình duyệt; system key có thể được cung cấp xuống browser để vượt hạn chế egress, vì vậy key đó không nên được coi là bí mật tuyệt đối. BYOK là lựa chọn dùng key cá nhân. Xem chi tiết tại /ai-security và /terms.`,
  },
  {
    id: "about-technology",
    title: "Công nghệ và triết lý dự án",
    route: "/about",
    keywords: ["about", "hệ thống", "công nghệ", "astro", "cloudflare", "supabase", "cloudinary", "github", "mit", "mã nguồn mở", "realtime"],
    content: `/about mô tả Lovely Yellow Cat là dự án Astro SSR chạy trên Cloudflare Workers/Edge, dùng Supabase cho Postgres, RLS và Realtime, Cloudinary cho media CDN, cùng CAT_AI/Gemini cho AI. Dự án mã nguồn mở MIT. Realtime được dùng cho các hoạt động như bình luận, reaction và đồng bộ một số thay đổi cộng đồng.`,
  },
  {
    id: "terms-and-support",
    title: "Điều khoản, bản quyền và hỗ trợ",
    route: "/terms",
    keywords: ["terms", "điều khoản", "bản quyền", "copyright", "gỡ bỏ", "phi thương mại", "hỗ trợ", "liên hệ", "email"],
    content: `/terms giải thích chính sách phi thương mại, trách nhiệm với nội dung người dùng, quy trình báo cáo/gỡ bỏ bản quyền, giới hạn vận hành, MIT License và quyền riêng tư hội thoại AI. Với khiếu nại bản quyền hoặc lỗi kỹ thuật, liên hệ nongtiensonpro@gmail.com. Không đưa lời tư vấn pháp lý thay cho luật sư; hãy dẫn người dùng đọc /terms cho nội dung đầy đủ.`,
  },
  {
    id: "admin",
    title: "Khu vực quản trị",
    route: "/admin",
    keywords: ["admin", "quản trị", "editor", "moderation", "duyệt", "audit", "recycle bin", "trash", "media explorer"],
    content: `Khu vực /admin chỉ dành cho staff có quyền phù hợp. Admin/editor quản lý bài viết và hàng đợi tác phẩm; admin có thêm quản lý người dùng, cài đặt, audit log và các công cụ moderation/media/trash. Không hướng dẫn người dùng thường truy cập hoặc suy đoán quyền của tài khoản nếu chưa xác thực.`,
  },
];

function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9/.:_-]+/g, " ")
    .trim();
}

function extractQuery(query: KnowledgeQuery): string {
  if (typeof query === "string") return query;
  return query
    .filter((message) => message?.role !== "model" && typeof message?.content === "string")
    .slice(-3)
    .map((message) => message.content || "")
    .join(" ");
}

function scoreEntry(entry: SiteKnowledgeEntry, query: string): number {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return 0;
  const queryTokens = new Set(normalizedQuery.split(/\s+/).filter((token) => token.length > 1));
  const title = normalizeForSearch(entry.title);
  const content = normalizeForSearch(entry.content);
  let score = 0;

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeForSearch(keyword);
    if (normalizedQuery.includes(normalizedKeyword)) score += normalizedKeyword.includes(" ") ? 8 : 5;
    for (const token of normalizeForSearch(keyword).split(/\s+/)) {
      if (token.length > 1 && queryTokens.has(token)) score += 2;
    }
  }
  for (const token of queryTokens) {
    if (title.includes(token)) score += 4;
    else if (content.includes(token)) score += 1;
  }
  return score;
}

export function selectSiteKnowledge(query: KnowledgeQuery, limit = 4): SiteKnowledgeEntry[] {
  const queryText = extractQuery(query);
  const scored = SITE_KNOWLEDGE_ENTRIES
    .map((entry, index) => ({ entry, score: scoreEntry(entry, queryText), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const matched = scored.filter((item) => item.score > 0).slice(0, Math.max(1, limit));
  if (matched.length > 0) return matched.map((item) => item.entry);

  return SITE_KNOWLEDGE_ENTRIES.filter((entry) =>
    ["identity-navigation", "gallery", "journal", "cat-ai"].includes(entry.id),
  ).slice(0, Math.max(1, limit));
}

export function buildSiteKnowledgePrompt(query: KnowledgeQuery, limit = 4): string {
  const entries = selectSiteKnowledge(query, limit);
  const retrieved = entries
    .map((entry) => `### ${entry.title}${entry.route ? ` (${entry.route})` : ""}\n${entry.content.trim()}`)
    .join("\n\n");

  return `${SITE_KNOWLEDGE_CORE.trim()}\n\nNGỮ CẢNH LIÊN QUAN ĐẾN CÂU HỎI HIỆN TẠI\n${retrieved}\n\nKhi thông tin là dữ liệu động, hãy nói rõ giới hạn và hướng người dùng mở đúng trang để xem dữ liệu mới nhất.`;
}
