# **VAPORWAVE DESIGN SYSTEM & RESPONSIVE CSS**
# **Tài liệu Đồng bộ Thẩm mỹ & Tối ưu Trải nghiệm Đa thiết bị**

> **Phạm vi:** Tài liệu này là chuẩn thiết kế bất biến (Design Bible) cho toàn bộ website tạp chí nghệ thuật Vaporwave. Mọi component, trang và tính năng mới đều phải tuân thủ các quy tắc trong tài liệu này để đảm bảo giao diện nhất quán từ màn hình 320px đến 4K, và từ thiết bị di động rẻ tiền đến máy tính cao cấp.

---

## **PHẦN I: HỆ THỐNG THIẾT KẾ VAPORWAVE (DESIGN SYSTEM)**

---

### **I.1. Triết lý Thẩm mỹ Cốt lõi**

Vaporwave không phải chỉ là một bảng màu. Đây là một **thế giới cảm xúc** — sự hoài niệm về một tương lai không tồn tại, được lọc qua ký ức về công nghệ năm 1984–1995. Mọi quyết định thiết kế phải phục vụ cảm giác này.

**Ba trục cảm xúc cần duy trì đồng thời:**

| Trục | Biểu hiện trong UI |
|:---|:---|
| **Hoài cổ (Nostalgia)** | Font bitmap, viền Win95 inset/outset, con trỏ mũi tên cổ điển, cửa sổ draggable |
| **Siêu thực (Surreal)** | Gradient không tồn tại trong tự nhiên, lưới phối cảnh (perspective grid), tượng cổ Hy Lạp |
| **Kỹ thuật số đang tan rã (Glitch)** | Hiệu ứng nhiễu sóng, text glitch, scanlines CRT, màu sắc lệch kênh RGB |

**Nguyên tắc vàng:** Khi phân vân giữa hai lựa chọn thiết kế, luôn chọn cái nào tạo cảm giác *"như thể được tìm thấy trên một máy tính cũ bị bỏ quên từ năm 1992"* hơn.

---

### **I.2. Hệ màu Chuẩn (Color Tokens)**

Toàn bộ màu sắc được khai báo tập trung trong `src/styles/global.css` dưới `@theme` của Tailwind v4. **Nghiêm cấm** dùng mã hex trực tiếp bất kỳ đâu trong code — phải dùng CSS variable hoặc Tailwind class tương ứng.

```css
@theme {
  /* ══════════════════════════════════════════
     NHÓM MÀU CHÍNH — Neon Signature
     Dùng cho: tiêu đề, accent, glow, border neon
  ══════════════════════════════════════════ */
  --color-vapor-pink:      #ff71ce;   /* Hồng neon — màu chủ đạo */
  --color-vapor-blue:      #01cdfe;   /* Xanh cyan — màu phụ chủ đạo */
  --color-vapor-purple:    #b967ff;   /* Tím neon — accent */
  --color-vapor-green:     #05ffa1;   /* Xanh lá neon — trạng thái tích cực */
  --color-vapor-yellow:    #fffb96;   /* Vàng nhạt — highlight, cảnh báo nhẹ */
  --color-vapor-orange:    #ff9a3c;   /* Cam hoàng hôn — accent thứ cấp */

  /* ══════════════════════════════════════════
     NHÓM MÀU NỀN — Dark Space Palette
     Dùng cho: background, surface, card
  ══════════════════════════════════════════ */
  --color-cosmic-black:    #0b001a;   /* Nền sâu nhất — trang, body */
  --color-cosmic-deep:     #120024;   /* Nền card, panel */
  --color-cosmic-mid:      #1a003a;   /* Nền hover, sidebar */
  --color-cosmic-surface:  #240050;   /* Nền input, elevated element */

  /* ══════════════════════════════════════════
     NHÓM MÀU WIN95 — Retro OS Palette
     Dùng cho: cửa sổ, nút, thanh tiêu đề Win95
  ══════════════════════════════════════════ */
  --color-win-gray:        #c0c0c0;   /* Màu xám Win95 cổ điển */
  --color-win-light:       #dfdfdf;   /* Cạnh sáng (highlight) */
  --color-win-dark:        #808080;   /* Cạnh tối (shadow) */
  --color-win-darkest:     #404040;   /* Cạnh tối nhất */
  --color-win-titlebar:    #000080;   /* Thanh tiêu đề xanh navy */
  --color-win-titletext:   #ffffff;   /* Chữ trên thanh tiêu đề */

  /* ══════════════════════════════════════════
     NHÓM MÀU VĂN BẢN
  ══════════════════════════════════════════ */
  --color-text-primary:    #e8d5ff;   /* Chữ chính — tím nhạt trên nền tối */
  --color-text-secondary:  #a08cc0;   /* Chữ phụ, placeholder */
  --color-text-muted:      #604880;   /* Chữ mờ, metadata */
  --color-text-on-win:     #000000;   /* Chữ trên nền Win95 xám */

  /* ══════════════════════════════════════════
     NHÓM MÀU TRẠNG THÁI
  ══════════════════════════════════════════ */
  --color-state-success:   #05ffa1;   /* = vapor-green */
  --color-state-error:     #ff4444;   /* Đỏ lỗi */
  --color-state-warning:   #fffb96;   /* = vapor-yellow */
  --color-state-info:      #01cdfe;   /* = vapor-blue */
}
```

**Quy tắc phối màu:**

- **Nền trang:** `cosmic-black` → `cosmic-deep` (gradient dọc từ trên xuống)
- **Tiêu đề lớn:** `vapor-pink` hoặc gradient `vapor-pink` → `vapor-purple`
- **Tiêu đề phụ:** `vapor-blue`
- **Văn bản thân:** `text-primary`
- **Cửa sổ Win95:** Nền `win-gray`, viền `win-light`/`win-dark`
- **Nút hành động chính:** Nền `win-gray` kiểu Win95, HOẶC nền `vapor-pink` với text `cosmic-black`
- **Trạng thái active/hover:** Glow `vapor-pink` hoặc `vapor-blue` bằng `box-shadow`

---

### **I.3. Hệ thống Typography**

**Bộ font sử dụng:**

```css
@theme {
  /* Font hiển thị — Tiêu đề lớn, branding */
  --font-display: 'VT323', 'Press Start 2P', monospace;

  /* Font retro UI — Cửa sổ Win95, nút, label */
  --font-retro: 'MS Sans Serif', 'Pixelated MS Sans Serif', 'Arial', sans-serif;

  /* Font thân bài — Nội dung đọc dài */
  --font-body: 'Courier New', 'Lucida Console', monospace;

  /* Font cyber — Số liệu, badge, tag */
  --font-mono: 'Share Tech Mono', 'Courier New', monospace;
}
```

**Cách nhúng Google Fonts vào `BaseLayout.astro`:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=VT323&family=Press+Start+2P&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```

**Thang kích thước chữ (Type Scale) — Fluid Typography:**

Dùng `clamp()` để chữ tự động scale giữa mobile và desktop mà không cần media query:

```css
@theme {
  /* Tiêu đề trang (h1) */
  --text-hero:    clamp(2rem,   6vw, 4rem);

  /* Tiêu đề section (h2) */
  --text-section: clamp(1.5rem, 4vw, 2.5rem);

  /* Tiêu đề card (h3) */
  --text-card:    clamp(1.1rem, 2.5vw, 1.5rem);

  /* Thân bài */
  --text-body:    clamp(0.9rem, 1.5vw, 1rem);

  /* Nhỏ — label, metadata */
  --text-small:   clamp(0.75rem, 1.2vw, 0.875rem);

  /* Cực nhỏ — timestamp, version */
  --text-xs:      clamp(0.65rem, 1vw, 0.75rem);
}
```

**Quy tắc dùng font:**

| Bối cảnh | Font | Màu |
|:---|:---|:---|
| Tiêu đề trang chủ | `font-display`, size `text-hero` | Gradient `vapor-pink` → `vapor-purple` |
| Tiêu đề Win95 titlebar | `font-retro`, bold, size 11px cố định | `win-titletext` trên nền `win-titlebar` |
| Nội dung bài viết | `font-body`, size `text-body` | `text-primary` |
| Nút hành động | `font-retro`, uppercase, size `text-small` | `text-on-win` trên Win95, hoặc `cosmic-black` trên neon |
| Tag, badge | `font-mono`, size `text-xs` | Màu tag tương ứng |
| Số liệu thống kê | `font-mono`, bold | `vapor-yellow` hoặc `vapor-green` |

---

### **I.4. Hệ thống Cửa sổ Win95 (Win95 Window System)**

Đây là component cốt lõi nhất của giao diện — mọi "hộp" nội dung đều là cửa sổ Win95 hoặc biến thể của nó.

**Công thức CSS viền Win95 chuẩn:**

```css
/* Viền nổi (raised) — dùng cho cửa sổ, nút chưa bấm */
.win95-raised {
  border: 2px solid;
  border-color: var(--color-win-light) var(--color-win-darkest)
                var(--color-win-darkest) var(--color-win-light);
  /* Hoặc dùng box-shadow để kiểm soát tốt hơn: */
  box-shadow:
    inset -1px -1px 0 var(--color-win-darkest),
    inset  1px  1px 0 var(--color-win-light),
    inset -2px -2px 0 var(--color-win-dark),
    inset  2px  2px 0 var(--color-win-gray);
}

/* Viền lõm (sunken) — dùng cho input, vùng hiển thị nội dung */
.win95-sunken {
  box-shadow:
    inset  1px  1px 0 var(--color-win-darkest),
    inset -1px -1px 0 var(--color-win-light),
    inset  2px  2px 0 var(--color-win-dark),
    inset -2px -2px 0 var(--color-win-gray);
}

/* Viền bẹt (flat) — dùng cho panel, statusbar */
.win95-flat {
  border: 1px solid var(--color-win-dark);
}
```

**Cấu trúc HTML chuẩn của một cửa sổ Win95 (dùng trong Astro/JSX):**

```html
<div class="win95-window">
  <!-- Thanh tiêu đề -->
  <div class="win95-titlebar">
    <div class="win95-titlebar-text">
      <img src="/icons/app-icon.png" width="16" height="16" alt="">
      Tiêu đề Cửa sổ
    </div>
    <div class="win95-titlebar-buttons">
      <button class="win95-btn-minimize" aria-label="Thu nhỏ">_</button>
      <button class="win95-btn-maximize" aria-label="Phóng to">□</button>
      <button class="win95-btn-close"    aria-label="Đóng">✕</button>
    </div>
  </div>
  <!-- Menu bar (tuỳ chọn) -->
  <div class="win95-menubar">
    <span>File</span>
    <span>Edit</span>
    <span>View</span>
  </div>
  <!-- Nội dung -->
  <div class="win95-content">
    <!-- Nội dung tuỳ ý -->
  </div>
  <!-- Status bar (tuỳ chọn) -->
  <div class="win95-statusbar">
    <span>Sẵn sàng</span>
  </div>
</div>
```

**CSS cho cấu trúc trên:**

```css
.win95-window {
  background: var(--color-win-gray);
  padding: 3px;
  box-shadow:
    inset -1px -1px 0 var(--color-win-darkest),
    inset  1px  1px 0 var(--color-win-light),
    inset -2px -2px 0 var(--color-win-dark),
    inset  2px  2px 0 var(--color-win-gray);
}

.win95-titlebar {
  background: linear-gradient(
    to right,
    var(--color-win-titlebar),
    #1084d0   /* gradient nhẹ cho chiều sâu */
  );
  color: var(--color-win-titletext);
  font: bold 11px/1 var(--font-retro);
  padding: 3px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  /* Trên mobile: thêm neon glow nhẹ để phân biệt */
  text-shadow: 0 0 8px rgba(1, 205, 254, 0.4);
}

.win95-titlebar-text {
  display: flex;
  align-items: center;
  gap: 4px;
}

.win95-titlebar-buttons {
  display: flex;
  gap: 2px;
}

/* Nút Win95 thu nhỏ/phóng to/đóng */
.win95-titlebar-buttons button {
  width: 16px;
  height: 14px;
  font: bold 9px/1 var(--font-retro);
  background: var(--color-win-gray);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset -1px -1px 0 var(--color-win-darkest),
    inset  1px  1px 0 var(--color-win-light);
}

.win95-titlebar-buttons button:active {
  box-shadow:
    inset  1px  1px 0 var(--color-win-darkest),
    inset -1px -1px 0 var(--color-win-light);
}

/* Trên mobile: tăng touch target */
@media (pointer: coarse) {
  .win95-titlebar-buttons button {
    width: 24px;
    height: 22px;
    font-size: 11px;
  }
}

.win95-menubar {
  display: flex;
  gap: 0;
  font: 11px var(--font-retro);
  color: var(--color-text-on-win);
  padding: 2px 0;
  border-bottom: 1px solid var(--color-win-dark);
}

.win95-menubar span {
  padding: 2px 8px;
  cursor: default;
}

.win95-menubar span:hover {
  background: var(--color-win-titlebar);
  color: white;
}

.win95-content {
  background: var(--color-cosmic-deep);
  padding: 8px;
  box-shadow:
    inset  1px  1px 0 var(--color-win-darkest),
    inset -1px -1px 0 var(--color-win-light);
  /* Nền tối cho nội dung Vaporwave */
}

.win95-statusbar {
  font: 11px var(--font-retro);
  color: var(--color-text-on-win);
  padding: 2px 4px;
  border-top: 1px solid var(--color-win-dark);
  display: flex;
  gap: 8px;
}

/* Chia ô statusbar */
.win95-statusbar-panel {
  padding: 1px 4px;
  box-shadow:
    inset  1px  1px 0 var(--color-win-dark),
    inset -1px -1px 0 var(--color-win-light);
}
```

**Biến thể Vaporwave Neon Window:**

Dùng khi muốn nhấn mạnh, khác với cửa sổ Win95 thuần:

```css
.vapor-window {
  background: var(--color-cosmic-deep);
  border: 1px solid var(--color-vapor-purple);
  box-shadow:
    0 0 10px rgba(185, 103, 255, 0.3),
    0 0 30px rgba(185, 103, 255, 0.1),
    inset 0 0 20px rgba(11, 0, 26, 0.8);
  /* Titlebar Vaporwave */
}

.vapor-window .win95-titlebar {
  background: linear-gradient(
    135deg,
    var(--color-vapor-purple),
    var(--color-vapor-pink)
  );
}
```

---

### **I.5. Hiệu ứng CRT & Glitch**

**Lớp phủ CRT toàn trang (trong `BaseLayout.astro`):**

```html
<!-- Đặt ngay trong <body>, trước tất cả nội dung -->
<div class="crt-overlay" aria-hidden="true">
  <div class="crt-scanlines"></div>
  <div class="crt-vignette"></div>
</div>
```

```css
/* Overlay bao phủ toàn viewport, không tương tác */
.crt-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}

/* Scanlines — đường quét ngang */
.crt-scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
  /* Trên mobile giảm opacity để không che nội dung */
  opacity: 0.6;
}

/* Vignette — làm tối 4 góc màn hình */
.crt-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(11, 0, 26, 0.6) 100%
  );
}

/* Flicker toàn trang — nhẹ, không gây khó chịu */
@keyframes crt-flicker {
  0%   { opacity: 1; }
  92%  { opacity: 1; }
  93%  { opacity: 0.97; }
  94%  { opacity: 1; }
  96%  { opacity: 0.98; }
  100% { opacity: 1; }
}

body {
  animation: crt-flicker 8s infinite;
}

/* Tắt flicker trên mobile để tiết kiệm pin */
@media (prefers-reduced-motion: reduce),
       (hover: none) {
  body { animation: none; }
  .crt-scanlines { opacity: 0.3; }
}
```

**Hiệu ứng Text Glitch — 3 biến thể:**

```css
/* Biến thể 1: Glitch mượt — dùng cho tiêu đề lớn */
@keyframes glitch-soft {
  0%, 90%, 100% {
    text-shadow: none;
    transform: none;
  }
  91% {
    text-shadow:
      2px 0 var(--color-vapor-pink),
      -2px 0 var(--color-vapor-blue);
    transform: translate(1px, 0);
  }
  93% {
    text-shadow:
      -3px 0 var(--color-vapor-pink),
      3px 0 var(--color-vapor-blue);
    transform: translate(-1px, 0);
  }
  95% {
    text-shadow: none;
    transform: translate(0, 1px);
  }
}

.text-glitch-soft {
  animation: glitch-soft 4s infinite;
}

/* Biến thể 2: Glitch mạnh — dùng cho tên trang/branding */
@keyframes glitch-strong {
  0%, 85%, 100% {
    clip-path: none;
    transform: none;
  }
  86% {
    clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%);
    transform: translate(-4px, 0);
    color: var(--color-vapor-blue);
  }
  88% {
    clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%);
    transform: translate(4px, 0);
    color: var(--color-vapor-pink);
  }
  90% {
    clip-path: none;
    transform: none;
    color: inherit;
  }
}

.text-glitch-strong {
  animation: glitch-strong 6s infinite;
}

/* Biến thể 3: Chỉ glow neon — dùng cho phần tử thường xuyên hiển thị */
@keyframes neon-pulse {
  0%, 100% {
    text-shadow:
      0 0 4px currentColor,
      0 0 10px currentColor,
      0 0 20px currentColor;
  }
  50% {
    text-shadow:
      0 0 2px currentColor,
      0 0 6px currentColor,
      0 0 12px currentColor;
  }
}

.text-neon-pulse {
  animation: neon-pulse 2s ease-in-out infinite;
}

/* Tắt toàn bộ animation khi user chọn reduced motion */
@media (prefers-reduced-motion: reduce) {
  .text-glitch-soft,
  .text-glitch-strong,
  .text-neon-pulse {
    animation: none;
    text-shadow: 0 0 8px currentColor;  /* Giữ glow tĩnh */
  }
}
```

**Hiệu ứng Nền Lưới Phối cảnh (Perspective Grid):**

```css
/* Nền lưới cho các section đặc biệt */
.vapor-grid-bg {
  position: relative;
  overflow: hidden;
}

.vapor-grid-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--color-vapor-purple) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-vapor-purple) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: center;
  opacity: 0.12;
  transform: perspective(500px) rotateX(60deg) scaleX(2);
  transform-origin: bottom center;
}

/* Gradient fade trên nền lưới */
.vapor-grid-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    var(--color-cosmic-black) 0%,
    transparent 30%,
    transparent 70%,
    var(--color-cosmic-black) 100%
  );
}
```

**Hiệu ứng Sun Aesthetic (mặt trời kẻ sọc):**

```css
/* Component mặt trời Vaporwave — chỉ dùng CSS */
.vapor-sun {
  width: clamp(120px, 30vw, 200px);
  height: clamp(60px, 15vw, 100px);
  border-radius: 200px 200px 0 0;
  background: linear-gradient(
    to bottom,
    var(--color-vapor-yellow) 0%,
    var(--color-vapor-orange) 30%,
    var(--color-vapor-pink) 60%,
    var(--color-vapor-purple) 100%
  );
  position: relative;
  overflow: hidden;
  /* Các đường kẻ ngang */
  mask-image: repeating-linear-gradient(
    to bottom,
    black 0px,
    black calc(8% - 2px),
    transparent calc(8% - 2px),
    transparent 8%
  );
}
```

---

### **I.6. Thành phần UI Chuẩn**

**Nút bấm (Button) — 4 biến thể:**

```css
/* Base styles chung */
.btn {
  font: bold 11px/1 var(--font-retro);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  transition: none;  /* Win95 không có transition */
  user-select: none;
  /* Touch target tối thiểu */
  min-height: 44px;
  padding: 0 16px;
}

/* Biến thể 1: Win95 raised (mặc định) */
.btn-win95 {
  background: var(--color-win-gray);
  color: var(--color-text-on-win);
  box-shadow:
    inset -1px -1px 0 var(--color-win-darkest),
    inset  1px  1px 0 var(--color-win-light),
    inset -2px -2px 0 var(--color-win-dark),
    inset  2px  2px 0 var(--color-win-gray);
}

.btn-win95:active,
.btn-win95[aria-pressed="true"] {
  box-shadow:
    inset  1px  1px 0 var(--color-win-darkest),
    inset -1px -1px 0 var(--color-win-light);
  padding-top: 2px;  /* Hiệu ứng nhấn xuống */
}

/* Biến thể 2: Neon primary */
.btn-neon-primary {
  background: var(--color-vapor-pink);
  color: var(--color-cosmic-black);
  border: 1px solid var(--color-vapor-pink);
  box-shadow:
    0 0 8px  rgba(255, 113, 206, 0.6),
    0 0 16px rgba(255, 113, 206, 0.3);
}

.btn-neon-primary:hover {
  box-shadow:
    0 0 12px rgba(255, 113, 206, 0.9),
    0 0 24px rgba(255, 113, 206, 0.5);
}

/* Biến thể 3: Ghost neon */
.btn-ghost-neon {
  background: transparent;
  color: var(--color-vapor-blue);
  border: 1px solid var(--color-vapor-blue);
  box-shadow: 0 0 6px rgba(1, 205, 254, 0.3);
}

.btn-ghost-neon:hover {
  background: rgba(1, 205, 254, 0.1);
  box-shadow: 0 0 12px rgba(1, 205, 254, 0.6);
}

/* Biến thể 4: Danger */
.btn-danger {
  background: var(--color-win-gray);
  color: var(--color-state-error);
  box-shadow: /* same as win95 */
    inset -1px -1px 0 var(--color-win-darkest),
    inset  1px  1px 0 var(--color-win-light);
}
```

**Form Input — Vaporwave style:**

```css
.input-vapor {
  background: var(--color-cosmic-black);
  color: var(--color-text-primary);
  border: none;
  font: 13px var(--font-mono);
  padding: 8px 12px;
  width: 100%;
  min-height: 44px;  /* Touch target */
  box-shadow:
    inset  1px  1px 0 var(--color-win-darkest),
    inset -1px -1px 0 var(--color-win-light),
    inset  2px  2px 0 var(--color-win-dark);
  outline: none;
  caret-color: var(--color-vapor-green);
}

.input-vapor::placeholder {
  color: var(--color-text-muted);
  font-style: italic;
}

.input-vapor:focus {
  box-shadow:
    inset  1px  1px 0 var(--color-win-darkest),
    inset -1px -1px 0 var(--color-win-light),
    inset  2px  2px 0 var(--color-win-dark),
    0 0 0 2px var(--color-vapor-blue),
    0 0 8px rgba(1, 205, 254, 0.4);
}

/* Textarea */
.textarea-vapor {
  /* Kế thừa input-vapor */
  resize: vertical;
  min-height: 100px;
  line-height: 1.6;
  scrollbar-color: var(--color-vapor-purple) var(--color-cosmic-deep);
}

/* Label */
.label-vapor {
  font: bold 11px var(--font-retro);
  color: var(--color-vapor-blue);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
  margin-bottom: 4px;
}
```

**Scrollbar tùy chỉnh:**

```css
/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-vapor-purple) var(--color-cosmic-deep);
}

/* Chrome/Edge/Safari */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-cosmic-deep);
}

::-webkit-scrollbar-thumb {
  background: var(--color-vapor-purple);
  border: 1px solid var(--color-cosmic-black);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-vapor-pink);
  box-shadow: 0 0 6px rgba(255, 113, 206, 0.6);
}

::-webkit-scrollbar-corner {
  background: var(--color-cosmic-black);
}
```

**Con trỏ chuột tùy chỉnh (desktop only):**

```css
/* Tạo cursor.cur từ emoji 📼 hoặc dùng SVG data URI */
@media (hover: hover) {
  body {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpolygon points='0,0 0,16 4,12 6,18 8,17 6,11 11,11' fill='%23c0c0c0' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E") 0 0, auto;
  }

  a, button, [role="button"], label[for] {
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath d='M6 1 L6 14 L9 11 L11 16 L13 15 L11 10 L15 10 Z' fill='%23ff71ce' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E") 0 0, pointer;
  }
}
```

---

---

## **PHẦN II: RESPONSIVE CSS — TỐI ƯU ĐA THIẾT BỊ**

---

### **II.1. Triết lý Responsive của Dự án**

**Mobile-First, nhưng Desktop là trải nghiệm đỉnh cao:**

Website này có hai "mode" cảm xúc khác nhau:
- **Mobile:** Gọn gàng, nhanh, trực tiếp — tập trung vào nội dung và gallery ảnh
- **Desktop:** Đầy đủ hiệu ứng CRT, cửa sổ Win95 draggable, con trỏ tùy chỉnh, glitch animation

Responsive không có nghĩa là "thu nhỏ desktop xuống mobile". Mà là **thiết kế lại trải nghiệm phù hợp với ngữ cảnh sử dụng** của từng thiết bị.

**5 Nguyên tắc Responsive không thương lượng:**

1. **Touch target tối thiểu 44×44px** cho mọi phần tử tương tác trên mobile
2. **Không có nội dung nào bị tràn ngang** (`overflow-x: hidden` trên `body` là cứu cánh cuối cùng, không phải giải pháp)
3. **Giảm/tắt animation nặng trên mobile** để tiết kiệm pin và tránh giật lag
4. **Font không được nhỏ hơn 16px** trên mobile để tránh iOS auto-zoom vào input
5. **Ảnh phải có `max-width: 100%`** và dùng Cloudinary để serve đúng kích thước

---

### **II.2. Hệ thống Breakpoint**

Khai báo CSS custom properties cho breakpoint — dùng nhất quán trong toàn dự án:

```css
/*
  Breakpoint Reference (chỉ đọc — không dùng trực tiếp làm var trong media query):

  xs:   < 480px   — Điện thoại nhỏ (iPhone SE, Galaxy A series)
  sm:   480–767px — Điện thoại thường (iPhone 14, Pixel)
  md:   768–1023px — Tablet (iPad, Galaxy Tab)
  lg:   1024–1279px — Laptop nhỏ, iPad Pro landscape
  xl:   1280–1535px — Desktop thường
  2xl:  ≥ 1536px  — Desktop lớn, màn hình 4K

  CHIẾN LƯỢC VIẾT MEDIA QUERY:
  - Dùng min-width (mobile-first) làm mặc định
  - Chỉ dùng max-width để OVERRIDE, không dùng làm primary
  - Ưu tiên clamp() và container queries thay media query khi có thể
*/
```

**Tailwind v4 — Cấu hình breakpoint tùy chỉnh:**

```css
@theme {
  --breakpoint-xs:  480px;
  --breakpoint-sm:  640px;
  --breakpoint-md:  768px;
  --breakpoint-lg:  1024px;
  --breakpoint-xl:  1280px;
  --breakpoint-2xl: 1536px;
}
```

---

### **II.3. Layout Hệ thống**

**Grid hệ thống linh hoạt:**

```css
/* Container chính — giới hạn chiều rộng nội dung */
.container-vapor {
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: clamp(1rem, 4vw, 2rem);
  /* clamp() tự scale padding: 16px trên mobile, 32px trên desktop */
}

/* Grid tự động điều chỉnh số cột */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
  gap: clamp(0.75rem, 2vw, 1.5rem);
}

/* Grid Gallery — điều chỉnh theo màn hình */
.grid-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: clamp(0.5rem, 1.5vw, 1rem);
}

/* Grid hai cột bài viết — col trái cố định, col phải flex */
.grid-article-layout {
  display: grid;
  grid-template-columns: 1fr;  /* mobile: 1 cột */
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .grid-article-layout {
    grid-template-columns: 1fr 320px;  /* desktop: nội dung + sidebar */
  }
}
```

**Masonry Grid nâng cao — responsive:**

```css
.masonry {
  columns: 1;
  column-gap: clamp(0.5rem, 1.5vw, 1rem);
}

/* 2 cột từ 480px */
@media (min-width: 480px) {
  .masonry { columns: 2; }
}

/* 3 cột từ 768px */
@media (min-width: 768px) {
  .masonry { columns: 3; }
}

/* 4 cột từ 1280px */
@media (min-width: 1280px) {
  .masonry { columns: 4; }
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: clamp(0.5rem, 1.5vw, 1rem);
  display: block;
}
```

---

### **II.4. Header & Navigation Responsive**

**Cấu trúc Header hai chế độ:**

Header desktop hiển thị navigation ngang; mobile chuyển sang hamburger menu dạng cửa sổ Win95 popup.

```css
/* ── Header wrapper ── */
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-cosmic-deep);
  border-bottom: 2px solid var(--color-vapor-purple);
  box-shadow: 0 2px 20px rgba(185, 103, 255, 0.3);
}

.site-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem clamp(1rem, 4vw, 2rem);
  min-height: 56px;
}

/* ── Logo / Branding ── */
.site-logo {
  font: bold clamp(1.1rem, 3vw, 1.5rem) var(--font-display);
  color: var(--color-vapor-pink);
  text-decoration: none;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

/* ── Desktop Nav ── */
.site-nav {
  display: none;  /* Ẩn trên mobile */
  align-items: center;
  gap: 0.25rem;
}

@media (min-width: 768px) {
  .site-nav { display: flex; }
  .hamburger-btn { display: none; }
}

.site-nav a {
  font: 11px var(--font-retro);
  text-transform: uppercase;
  color: var(--color-text-primary);
  text-decoration: none;
  padding: 6px 12px;
  border: 1px solid transparent;
  letter-spacing: 0.1em;
  transition: color 0.15s, border-color 0.15s;
}

.site-nav a:hover,
.site-nav a[aria-current="page"] {
  color: var(--color-vapor-blue);
  border-color: var(--color-vapor-blue);
  box-shadow: 0 0 8px rgba(1, 205, 254, 0.3);
}

/* ── Hamburger Button (mobile) ── */
.hamburger-btn {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  background: none;
  border: none;
  cursor: pointer;
  /* Touch target 44px */
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
}

.hamburger-btn span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--color-vapor-pink);
  box-shadow: 0 0 4px var(--color-vapor-pink);
  transition: transform 0.2s, opacity 0.2s;
}

/* Trạng thái menu mở: biến thành X */
.hamburger-btn[aria-expanded="true"] span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}
.hamburger-btn[aria-expanded="true"] span:nth-child(2) {
  opacity: 0;
}
.hamburger-btn[aria-expanded="true"] span:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
}

/* ── Mobile Menu Drawer ── */
.mobile-menu {
  position: fixed;
  top: 56px;  /* Ngay dưới header */
  left: 0;
  right: 0;
  background: var(--color-cosmic-deep);
  border: 1px solid var(--color-vapor-purple);
  border-top: none;
  box-shadow: 0 8px 32px rgba(11, 0, 26, 0.9);
  z-index: 99;

  /* Trạng thái đóng */
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.mobile-menu[aria-hidden="false"] {
  max-height: 80vh;
  overflow-y: auto;
}

.mobile-menu a {
  display: block;
  padding: 14px 24px;
  font: 12px var(--font-retro);
  text-transform: uppercase;
  color: var(--color-text-primary);
  text-decoration: none;
  border-bottom: 1px solid rgba(185, 103, 255, 0.2);
  letter-spacing: 0.1em;
}

.mobile-menu a:active {
  background: rgba(255, 113, 206, 0.1);
  color: var(--color-vapor-pink);
}
```

---

### **II.5. Gallery Responsive — Chi tiết**

**Card ảnh trong gallery:**

```css
.gallery-card {
  position: relative;
  overflow: hidden;
  background: var(--color-cosmic-deep);
  /* Viền Win95 với glow neon */
  box-shadow:
    inset -1px -1px 0 var(--color-win-darkest),
    inset  1px  1px 0 rgba(255, 255, 255, 0.15),
    0 0 0 1px var(--color-vapor-purple),
    0 0 12px rgba(185, 103, 255, 0.15);
  cursor: pointer;
  /* Không dùng transition trên mobile */
}

@media (hover: hover) {
  .gallery-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .gallery-card:hover {
    transform: translateY(-3px) scale(1.01);
    box-shadow:
      inset -1px -1px 0 var(--color-win-darkest),
      inset  1px  1px 0 rgba(255, 255, 255, 0.15),
      0 0 0 1px var(--color-vapor-pink),
      0 0 20px rgba(255, 113, 206, 0.4);
  }
}

/* Ảnh bên trong card */
.gallery-card-img {
  width: 100%;
  height: auto;
  display: block;
  /* Placeholder blur trước khi ảnh load */
  background: var(--color-cosmic-mid);
  transition: filter 0.3s ease;
}

.gallery-card-img.loading {
  filter: blur(8px);
  transform: scale(1.05);
}

.gallery-card-img.loaded {
  filter: none;
  transform: scale(1);
}

/* Overlay thông tin xuất hiện khi hover (desktop) / luôn hiện (mobile) */
.gallery-card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(
    to top,
    rgba(11, 0, 26, 0.95) 0%,
    rgba(11, 0, 26, 0.7)  50%,
    transparent 100%
  );

  /* Desktop: ẩn, hiện khi hover */
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* Mobile: luôn hiển thị overlay */
@media (hover: none) {
  .gallery-card-overlay {
    opacity: 1;
    transform: none;
  }
}

@media (hover: hover) {
  .gallery-card:hover .gallery-card-overlay {
    opacity: 1;
    transform: translateY(0);
  }
}

.gallery-card-title {
  font: bold clamp(0.75rem, 2vw, 0.875rem) var(--font-retro);
  color: var(--color-text-primary);
  margin: 0 0 4px;
  /* Cắt text tràn */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-card-author {
  font: clamp(0.65rem, 1.5vw, 0.75rem) var(--font-mono);
  color: var(--color-vapor-blue);
  margin: 0;
}
```

---

### **II.6. Lightbox Responsive**

```css
/* Overlay nền */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(11, 0, 26, 0.95);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  /* Safe area cho iPhone notch/home indicator */
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}

/* Layout lightbox theo chiều dọc trên mobile, ngang trên desktop */
.lightbox-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

@media (min-width: 768px) and (orientation: landscape) {
  .lightbox-inner {
    flex-direction: row;
  }
}

/* Vùng ảnh */
.lightbox-image-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 0;  /* Quan trọng: cho phép co lại trong flex */
  padding: 1rem;
}

.lightbox-image-area img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 0 40px rgba(255, 113, 206, 0.3);
}

/* Panel thông tin — dưới ảnh trên mobile, bên phải trên desktop */
.lightbox-info-panel {
  background: var(--color-cosmic-deep);
  border-top: 1px solid var(--color-vapor-purple);
  padding: clamp(12px, 3vw, 20px);
  overflow-y: auto;

  /* Mobile: chiều cao cố định ~35% */
  max-height: 35vh;
}

@media (min-width: 768px) and (orientation: landscape) {
  .lightbox-info-panel {
    width: 320px;
    max-height: none;
    border-top: none;
    border-left: 1px solid var(--color-vapor-purple);
    flex-shrink: 0;
  }
}

/* Nút điều hướng Prev/Next — touch-friendly */
.lightbox-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  /* Touch target lớn */
  width: 44px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(11, 0, 26, 0.7);
  border: 1px solid var(--color-vapor-purple);
  color: var(--color-vapor-pink);
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
  /* Không bị che bởi ảnh */
  backdrop-filter: blur(4px);
}

.lightbox-nav-prev { left: 0; border-radius: 0 4px 4px 0; }
.lightbox-nav-next { right: 0; border-radius: 4px 0 0 4px; }

/* Trên màn hình rất nhỏ: giảm kích thước */
@media (max-width: 360px) {
  .lightbox-nav-btn {
    width: 32px;
    height: 60px;
    font-size: 1.1rem;
  }
}

/* Nút đóng — góc trên phải */
.lightbox-close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(11, 0, 26, 0.8);
  border: 1px solid var(--color-vapor-pink);
  color: var(--color-vapor-pink);
  font-size: 1.2rem;
  cursor: pointer;
  z-index: 1010;
}
```

---

### **II.7. Typography Responsive**

```css
/* Tiêu đề trang chủ — gradient text */
.hero-title {
  font: bold var(--text-hero) / 1.1 var(--font-display);
  background: linear-gradient(
    135deg,
    var(--color-vapor-pink),
    var(--color-vapor-purple),
    var(--color-vapor-blue)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: clamp(0.02em, 0.5vw, 0.1em);
  text-align: center;
}

/* Trên mobile: giảm letter-spacing để chữ không vỡ dòng */
@media (max-width: 480px) {
  .hero-title {
    letter-spacing: 0.02em;
    line-height: 1.2;
  }
}

/* Tiêu đề section */
.section-title {
  font: bold var(--text-section) / 1.2 var(--font-display);
  color: var(--color-vapor-blue);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-block: 0 clamp(1rem, 3vw, 2rem);
}

/* Dấu phân cách section kiểu Vaporwave */
.section-divider {
  border: none;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    var(--color-vapor-purple),
    var(--color-vapor-pink),
    var(--color-vapor-purple),
    transparent
  );
  margin-block: clamp(2rem, 5vw, 4rem);
  position: relative;
}

.section-divider::after {
  content: '◆';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-vapor-pink);
  font-size: 0.75rem;
  background: var(--color-cosmic-black);
  padding: 0 8px;
}

/* Văn bản thân bài — tối ưu đọc */
.prose-vapor {
  font: var(--text-body) / 1.8 var(--font-body);
  color: var(--color-text-primary);
  max-width: 65ch;  /* Không vượt quá 65 ký tự/dòng */
  /* Trên mobile: không giới hạn */
}

@media (max-width: 640px) {
  .prose-vapor {
    max-width: 100%;
    line-height: 1.7;
  }
}
```

---

### **II.8. Tối ưu Hiệu ứng theo Thiết bị**

Đây là phần quan trọng nhất để đảm bảo performance trên thiết bị yếu.

**Chiến lược phân tầng hiệu ứng:**

```css
/*
  TIER 1 — Mọi thiết bị (không thể tắt):
  ✓ Màu sắc, gradient background
  ✓ Box-shadow tĩnh (không animation)
  ✓ Border neon tĩnh
  ✓ Opacity transition ngắn (< 150ms)

  TIER 2 — Thiết bị có hover (desktop/laptop):
  ✓ Transform hover (scale, translateY)
  ✓ Box-shadow transition
  ✓ Overlay transition
  → Dùng @media (hover: hover)

  TIER 3 — Thiết bị đủ mạnh (không prefers-reduced-motion):
  ✓ Glitch animation trên text
  ✓ CRT flicker
  ✓ Scanline animation
  ✓ Neon pulse
  → Dùng @media (prefers-reduced-motion: no-preference)

  TIER 4 — Desktop cao cấp (không mobile, không reduced motion):
  ✓ Perspective grid animation
  ✓ Particle effects
  ✓ Con trỏ chuột tùy chỉnh
  → Kết hợp (hover: hover) + (prefers-reduced-motion: no-preference)
*/

/* Ví dụ áp dụng đúng phân tầng */

/* TIER 1 — Luôn có */
.neon-border {
  border: 1px solid var(--color-vapor-purple);
  box-shadow: 0 0 8px rgba(185, 103, 255, 0.3);
}

/* TIER 2 — Chỉ desktop hover */
@media (hover: hover) {
  .neon-border:hover {
    border-color: var(--color-vapor-pink);
    box-shadow: 0 0 16px rgba(255, 113, 206, 0.6);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
}

/* TIER 3 — Animation chỉ khi user không yêu cầu giảm motion */
@media (prefers-reduced-motion: no-preference) {
  .text-glitch-soft {
    animation: glitch-soft 4s infinite;
  }

  .crt-scanlines-animated {
    animation: scanline-move 8s linear infinite;
  }
}

/* TIER 4 — Desktop + không reduced motion */
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .perspective-grid {
    animation: grid-drift 20s ease-in-out infinite;
  }

  body {
    animation: crt-flicker 8s infinite;
  }
}
```

**Tối ưu `will-change` — chỉ dùng khi thực sự cần:**

```css
/*
  Chỉ đặt will-change trên phần tử SẮP animate, rồi xóa sau khi xong.
  ĐỪNG đặt will-change toàn bộ — tốn GPU memory.
*/

/* Đúng: Dùng trong React component khi bắt đầu animation */
.lightbox-image-entering {
  will-change: transform, opacity;
}

/* Đúng: Dùng trong CSS chỉ khi hover */
@media (hover: hover) {
  .gallery-card:hover {
    will-change: transform;
  }
}

/* Sai: will-change luôn luôn */
/* .gallery-card { will-change: transform; }  ← ĐỪNG làm thế này */
```

**GPU Compositing — giữ animation trong compositor thread:**

```css
/*
  Chỉ animate các property sau để animation KHÔNG kéo main thread:
  ✓ transform (translate, scale, rotate)
  ✓ opacity
  ✓ filter (nhưng tốn kém hơn)

  TRÁNH animate các property này (kéo main thread, gây layout/repaint):
  ✗ width, height
  ✗ top, left, right, bottom (dùng translate thay)
  ✗ margin, padding
  ✗ background-color (thay bằng opacity overlay)
  ✗ box-shadow (với animation phức tạp)
*/

/* Sai — animate margin */
/* @keyframes slide-in { from { margin-left: -100%; } to { margin-left: 0; } } */

/* Đúng — animate transform */
@keyframes slide-in-correct {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}
```

---

### **II.9. Touch & Gesture Optimizations**

```css
/* Tắt highlight xanh khi tap trên Android/Chrome */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Tùy chỉnh highlight cho touch (màu Vaporwave) */
a:focus-visible,
button:focus-visible,
[role="button"]:focus-visible {
  outline: 2px solid var(--color-vapor-blue);
  outline-offset: 2px;
}

/* Ngăn text bị select khi vuốt/swipe */
.gallery-card,
.lightbox-nav-btn,
.win95-titlebar {
  user-select: none;
  -webkit-user-select: none;
}

/* Tối ưu scroll momentum trên iOS */
.mobile-menu,
.lightbox-info-panel,
.gallery-container {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* Ngăn bounce scroll trên iOS ở các container nested */
.win95-content,
.lightbox-inner {
  overscroll-behavior: none;
}

/* Disable double-tap zoom trên iOS cho các nút */
button,
a,
[role="button"] {
  touch-action: manipulation;
}

/* Vùng swipe gallery — nhận gesture ngang */
.swipe-target {
  touch-action: pan-y;  /* Cho phép cuộn dọc, chặn ngang để xử lý */
}
```

**Xử lý Touch Swipe trong TypeScript (dùng trong `GalleryLightbox.tsx`):**

```typescript
// Hook custom để nhận swipe gesture
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Chỉ nhận swipe ngang, bỏ qua nếu vuốt chủ yếu theo chiều dọc
    if (Math.abs(deltaX) < Math.abs(deltaY) * 0.8) return;
    // Ngưỡng tối thiểu 50px
    if (Math.abs(deltaX) < 50) return;

    if (deltaX < 0) onSwipeLeft();   // Vuốt trái → ảnh tiếp theo
    else            onSwipeRight();  // Vuốt phải → ảnh trước
  };

  return { handleTouchStart, handleTouchEnd };
}
```

---

### **II.10. Ảnh Responsive với Cloudinary**

**Hàm tạo URL Cloudinary responsive:**

```typescript
// src/lib/cloudinary.ts

type ImageSize = 'thumb' | 'card' | 'full' | 'og';

const TRANSFORMS: Record<ImageSize, string> = {
  thumb: 'w_20,e_blur:1000,q_10,f_auto',        // Placeholder blur
  card:  'w_600,q_auto,f_auto,c_fill',            // Thumbnail trong gallery
  full:  'w_1400,q_auto,f_auto',                  // Lightbox full
  og:    'w_1200,h_630,c_fill,q_auto,f_auto',     // Open Graph
};

export function cloudinaryUrl(
  publicId: string,
  size: ImageSize,
  cloudName: string = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME
): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${TRANSFORMS[size]}/${publicId}`;
}

// Tạo srcset cho responsive images
export function cloudinarySrcset(publicId: string, cloudName?: string): string {
  const widths = [320, 480, 640, 800, 1024, 1280, 1600];
  return widths
    .map(w => `${cloudinaryUrl(publicId, 'full', cloudName).replace('w_1400', `w_${w}`)} ${w}w`)
    .join(', ');
}
```

**Dùng trong component Astro:**

```astro
---
import { cloudinaryUrl, cloudinarySrcset } from '../lib/cloudinary';
const { submission } = Astro.props;
const thumbUrl = cloudinaryUrl(submission.image_pid, 'thumb');
const cardUrl  = cloudinaryUrl(submission.image_pid, 'card');
---

<img
  src={thumbUrl}
  data-src={cardUrl}
  srcset={cloudinarySrcset(submission.image_pid)}
  sizes="(max-width: 480px) 100vw,
         (max-width: 768px) 50vw,
         (max-width: 1280px) 33vw,
         25vw"
  alt={submission.title}
  loading="lazy"
  decoding="async"
  class="gallery-card-img loading"
  width="600"
  height="450"
/>
```

---

### **II.11. Tối ưu cho iOS Safari — Các bẫy phổ biến**

iOS Safari có nhiều quirk riêng cần xử lý đặc biệt:

```css
/* 1. Viewport height thực sự trên iOS (address bar ăn vào) */
.fullscreen-element {
  /* Cách cũ — bị address bar che */
  /* height: 100vh; */

  /* Cách mới — dùng dvh (dynamic viewport height) */
  height: 100dvh;

  /* Fallback cho trình duyệt cũ hơn */
  height: 100vh;
  height: 100dvh;
}

/* 2. Safe area cho màn hình tai thỏ/Dynamic Island */
.site-header {
  padding-top: env(safe-area-inset-top, 0);
}

.mobile-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

/* 3. Font size tối thiểu 16px cho input — tránh iOS auto-zoom */
input, textarea, select {
  font-size: max(16px, 1rem);
}

/* 4. Ngăn callout (menu popup) khi long-press ảnh */
.gallery-card-img {
  -webkit-touch-callout: none;
}

/* 5. Position fixed trong transform context bị broken trên iOS */
/* Đừng đặt position: fixed bên trong phần tử có transform */
/* Thay bằng position: sticky hoặc dùng portal ra body */

/* 6. Backdrop-filter cần prefix */
.blur-panel {
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

/* 7. Smooth scroll chỉ dùng khi không reduced motion */
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

---

### **II.12. Dark Mode và Hệ thống Màu**

Vaporwave về bản chất đã là "dark mode" — nhưng cần handle `prefers-color-scheme` đúng cách:

```css
/*
  Vaporwave mặc định là dark.
  Khi user thiết bị dùng light mode, KHÔNG chuyển sang light theme
  (sẽ phá vỡ thẩm mỹ) — thay vào đó giảm nhẹ độ tương phản.
*/

:root {
  color-scheme: dark;  /* Báo trình duyệt đây là dark theme */
}

/* Điều chỉnh nhẹ cho light mode — không thay đổi màu sắc chính */
@media (prefers-color-scheme: light) {
  :root {
    /* Giảm độ sáng của CRT overlay để không chói */
    --crt-scanline-opacity: 0.3;
    --crt-vignette-opacity: 0.4;
  }

  /* Không thay đổi màu Vaporwave — đây là quyết định design có chủ ý */
}
```

---

### **II.13. Print Styles**

```css
@media print {
  /* Ẩn toàn bộ hiệu ứng visual */
  .crt-overlay,
  .vapor-grid-bg::before,
  .site-header,
  .site-footer,
  .gallery-card-overlay,
  .reaction-bar,
  .btn-win95,
  .win95-titlebar-buttons {
    display: none !important;
  }

  /* Đơn giản hóa màu sắc */
  body {
    background: white;
    color: black;
    font-family: 'Times New Roman', serif;
  }

  /* Đảm bảo ảnh in ra được */
  img {
    max-width: 100% !important;
    page-break-inside: avoid;
  }

  /* Tiêu đề in thường */
  .hero-title, .section-title {
    -webkit-text-fill-color: black;
    background: none;
    color: black;
    text-shadow: none;
    animation: none;
  }
}
```

---

## **PHẦN III: CHECKLIST KIỂM TRA TRƯỚC KHI DEPLOY**

---

### **III.1. Checklist Thẩm mỹ Vaporwave**

Trước khi merge bất kỳ UI mới nào, kiểm tra toàn bộ các mục sau:

```
BẢNG MÀU
☐ Không có mã hex trực tiếp trong code (phải dùng CSS variable)
☐ Nền tối nhất dùng --color-cosmic-black (#0b001a)
☐ Accent chính dùng --color-vapor-pink hoặc --color-vapor-blue
☐ Không có màu trắng thuần (#fff) trong nền — chỉ dùng cho text on dark

TYPOGRAPHY
☐ Tiêu đề lớn dùng --font-display (VT323)
☐ UI label/nút dùng --font-retro
☐ Nội dung dài dùng --font-body
☐ Không có font sans-serif hiện đại (Inter, Roboto, etc.)

HIỆU ỨNG
☐ CRT scanlines hiển thị đúng trên desktop
☐ Scanlines giảm opacity trên mobile
☐ Glitch animation đúng ở --font-display headings
☐ Animation tắt khi prefers-reduced-motion: reduce

WIN95 COMPONENTS
☐ Viền raised/sunken đúng 4 lớp box-shadow
☐ Titlebar gradient xanh navy
☐ Nút hành động có hiệu ứng "nhấn xuống" khi active
☐ Không có border-radius trên Win95 elements (góc vuông)

NHẤT QUÁN
☐ Tất cả icon dùng emoji 8-bit hoặc pixel art, không dùng icon library hiện đại
☐ Scrollbar tùy chỉnh hiển thị màu Vaporwave
☐ Focus state rõ ràng (outline neon) cho accessibility
```

### **III.2. Checklist Responsive**

```
MOBILE (320px – 480px)
☐ Không có nội dung bị tràn ngang (overflow)
☐ Touch target ≥ 44×44px cho tất cả phần tử tương tác
☐ Font size input ≥ 16px (tránh iOS auto-zoom)
☐ Navigation hamburger hoạt động đúng
☐ Gallery hiển thị 1-2 cột gọn gàng
☐ Lightbox chiếm đúng 100dvh, không bị address bar che
☐ Nút Prev/Next lightbox đủ lớn để chạm

TABLET (768px – 1023px)
☐ Grid gallery 2-3 cột đều đẹp
☐ Navigation có thể dùng cả hamburger lẫn horizontal
☐ Trang chi tiết bài viết bố cục 1 cột vẫn đọc tốt
☐ Lightbox info panel ở dưới (portrait) / bên phải (landscape)

DESKTOP (1024px+)
☐ Max-width container không vượt 1200px
☐ Hover effects hoạt động (hover: hover)
☐ Con trỏ chuột tùy chỉnh hiển thị
☐ CRT flicker animation chạy mượt
☐ Gallery 3-4 cột đẹp mắt

HIỆU NĂNG
☐ Không có layout shift (CLS) khi ảnh load
☐ Ảnh có width/height attribute để tránh CLS
☐ Animation dùng transform/opacity, không dùng top/left/width
☐ will-change chỉ áp dụng khi cần thiết
☐ CRT overlay dùng pointer-events: none (không chặn click)

ACCESSIBILITY
☐ Contrast ratio text/nền ≥ 4.5:1 (WCAG AA)
☐ Focus visible rõ ràng (không ẩn outline)
☐ ARIA labels đầy đủ cho nút không có text
☐ Lightbox trap focus đúng khi mở
☐ Ảnh có alt text có nghĩa
☐ Reduced motion được tôn trọng
```

---

## **PHẦN IV: CHỈ DẪN NẠP TÀI LIỆU CHO AI (VIBECODING)**

> [!TIP]
> **Mẫu lệnh khi yêu cầu AI xây dựng component mới:**
>
> *"Bạn là frontend engineer chuyên Vaporwave/Win95. Đọc tài liệu Design System và Responsive CSS guide này. Xây dựng [TÊN COMPONENT] với các yêu cầu:*
>
> *— Dùng đúng CSS variables từ `@theme` (--color-vapor-pink, --font-display, v.v.)*
> *— Win95 window dùng đúng công thức 4-layer box-shadow*
> *— Touch target ≥ 44px cho tất cả phần tử tương tác*
> *— Animation chỉ áp dụng qua `@media (hover: hover)` và `(prefers-reduced-motion: no-preference)`*
> *— Không dùng font sans-serif hiện đại, không có màu hex trực tiếp*
> *— Ảnh dùng hàm `cloudinaryUrl()` với transform phù hợp*
> *— Component phải đọc đẹp trên cả iPhone SE (320px) lẫn màn hình 4K"*

---

## **TÀI LIỆU THAM KHẢO**

1. *Vaporwave Aesthetic Archive:* https://aesthetics.fandom.com/wiki/Vaporwave
2. *Windows 95 UI Guidelines (Microsoft):* https://retroui.netlify.app/
3. *CSS `clamp()` Calculator:* https://clamp.font-size.app/
4. *CSS `prefers-reduced-motion`:* https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
5. *Cloudinary Transformation Reference:* https://cloudinary.com/documentation/transformation_reference
6. *Safe Area Insets (iOS):* https://webkit.org/blog/7929/designing-websites-for-iphone-x/
7. *WCAG Contrast Checker:* https://webaim.org/resources/contrastchecker/
8. *CSS `@media (hover: hover)`:* https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover
9. *Dynamic Viewport Units (`dvh`):* https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths
10. *GPU-Composited Animation:* https://web.dev/articles/animations-guide
ENDOFFILE
echo "Done"
