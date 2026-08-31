# RETRO KERNEL — Migration Guide (v5 Phase 1)

> Ref: `docs/adr/ADR-0001` (token), `ADR-0003` (progressive enhancement), kế hoạch v5 §3.3.

## Khi nào dùng gì

| Tình huống | Dùng | Không dùng |
|---|---|---|
| Nút bấm mọi nơi | `<RetroButton variant size icon busy />` | `win95-btn` + inline `style=min-height` mới |
| Cửa sổ Win95 | `<RetroWindow />` (kernel) | markup `win95-container` + `win95-header` viết tay mới |
| Cửa sổ trong code cũ | `<Win95Window />` (adapter giữ API cũ, delegate sang kernel) | — |
| Input/select/textarea | `<RetroInput />` `<RetroSelect />` `<RetroTextarea />` | `input-vapor` class mồ côi |
| Bảng dữ liệu | `<RetroTable />` `<RetroTh />` `<RetroTd />` | `<table>` thô mới |
| Trạng thái rỗng/lỗi | `<RetroEmptyState />` | div tự viết mới |
| Ảnh | `<RetroImage />` (React) hoặc `<RetroImage.astro />` | `<img>` không srcset/decoding mới |

## Quy tắc màu (ADR-0001)

1. **KHÔNG hex literal mới** trong `.astro/.tsx`. Màu lấy từ `@theme` của Tailwind: `bg-vapor-pink`, `text-vapor-blue`, `border-win-dark`... (toàn bộ token đã sinh vào `src/styles/tokens.gen.css`).
2. Cần màu mới? Thêm vào `src/ui/tokens/primitives.json` → chạy `npm run tokens` → dùng class Tailwind tương ứng. Không bao giờ hard-code.
3. Glow: dùng `.glow-pink` / `.glow-green` thay `shadow-[0_0_6px_...]`.
4. z-index: `.z-command/.z-modal/.z-toast` hoặc token `--z-index-*`. Cấm `z-[9999]`.
5. Gate: `npm run policy:ui` — ratchet **142** (hex markup không trùng token). Thêm hex mới ⇒ CI fail. Giảm được thì cập nhật `artifacts/ui-policy-count.json`.

## Token pipeline

```
src/ui/tokens/primitives.json   # giá trị thô
src/ui/tokens/semantic.json     # role theo mode (catalog/crt/access)
        │ npm run tokens
        ▼
src/styles/tokens.gen.css       # :root vars + [data-ui-mode] overrides
src/ui/tokens/tokens.gen.ts     # COLOR_TOKENS / Z_INDEX / UI_MODES (typed)
```

- `npm run tokens:check` chạy tự động trong `prebuild` — file gen lệch source ⇒ build fail.
- Contrast WCAG được validate trong generator (12 pair, min 4.5/7.0).

## Chế độ hiển thị (chuẩn bị Phase 2)

Gắn `data-ui-mode="crt"` (hoặc `"access"`) lên `<html>` — semantic roles tự đổi theo override trong `tokens.gen.css`. JS selector service sẽ đến ở Phase 2 (preferenceStore).

## Hydration

Mặc định `client:visible` / `client:idle`. `client:load` chỉ dành cho shell/chat. `DialogHost` dùng `client:idle` ở cả 2 layout.
