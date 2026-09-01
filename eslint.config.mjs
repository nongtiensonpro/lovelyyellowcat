// ESLint 9 flat config — LovelyYellowCat v5.2
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["build/**", "dist/**", ".verify-dist/**", ".astro/**", "node_modules/**", "artifacts/**"],
  },
  // v5.2: eslint-disable không còn dùng nữa = ERROR ngay tại lint
  // (ratchet check-lint-debt không đếm được message ruleId=null của directive chết)
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    // v5.2: exhaustive-deps nâng warn → error (deps sai = closure cũ = bug state thật,
    // đã dọn sạch 0 vi phạm ở v5.1 — giữ error để không quay lại)
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["src/**/*.{astro,tsx,ts}"],
    rules: {
      // ADR-0003: cấm native dialog (thay bằng Dialog/Toast service)
      "no-restricted-syntax": [
        "error",
        { selector: "CallExpression[callee.name='alert']", message: "Dùng dialogService thay alert()" },
        { selector: "CallExpression[callee.name='confirm']", message: "Dùng dialogService.confirm() thay confirm()" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // Frontend — cho phép error/warn (error-path ops), cấm console.log lỏng
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
  {
    // Server-side (Cloudflare Worker logs) — console.* là ops logging chuẩn, tắt rule.
    // v5.2: thu hẹp từ "src/lib/**" (quá rộng — supabaseBrowser/a11y/aiCrypto/markdown/
    // siteKnowledge chạy ở browser islands) xuống đúng 5 file lib server-only:
    // adminAudit, adminModeration, cloudinary (env server), emailNotification
    // (cloudflare:sockets), supabase (Astro cookies SSR). Island browser giờ
    // rơi về rule frontend phía trên — console.log mới trong đó = warning = fail ratchet.
    files: [
      "src/pages/api/**",
      "src/lib/adminAudit.ts",
      "src/lib/adminModeration.ts",
      "src/lib/cloudinary.ts",
      "src/lib/emailNotification.ts",
      "src/lib/supabase.ts",
      "src/middleware.ts",
      "src/pages/admin/**",
    ],
    rules: { "no-console": "off" },
  },
  {
    // ─── Chất lượng cơ học — WARN + ratchet baseline 0 (artifacts/lint-baseline.json):
    // baseline=0 nghĩa là MỖI warning mới làm fail CI (check-lint-debt.mjs).
    // Giữ warn thay vì error để phân loại "chất lượng" khỏi "bug runtime".
    // KHÔNG hạ severity: react-hooks/rules-of-hooks + exhaustive-deps (error),
    // no-restricted-syntax alert/confirm (error) — bảo vệ runtime thật.
    files: ["**/*.{ts,tsx,astro}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-var": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "prefer-const": "warn",
      "no-useless-escape": "warn",
      // .astro dùng cú pháp for= (HTML chuẩn) — rule cần depth cho label-bọc-control + cả 2 kiểu association
      // Batch 7: .astro markup đã verify tay 15/15 label for= chuẩn HTML + wrapping hợp lệ;
      // parser astro không nhận for= → tắt riêng .astro (block cuối). TSX giữ rule (lỗi thật sửa tận gốc).
      "jsx-a11y/label-has-associated-control": ["warn", {
        labelComponents: ["label"],
        labelAttributes: ["for", "htmlFor"],
        controlComponents: ["input", "select", "textarea", "output", "RetroInput", "RetroSelect", "RetroTextarea"],
        depth: 3,
        assert: "either",
      }],
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
    },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // v5.2 (probe .lyc-eslint-probe.mjs, 48 file .astro): jsx-a11y KHÔNG phân tích được
    // cấu trúc template .astro cho label rule — cả for=+id khớp (16/21) lẫn wrapping
    // label>input chuẩn HTML (media.astro checkbox) đều false-positive. Giữ off;
    // 4 bug thật đã sửa tận gốc ở v5.2 (users.astro x3 for/id, comments.astro id theo
    // comment.id vì form lặp). TSX giữ rule — parser TSX hoạt động đúng.
    // 2 rule dưới probe = 0 warning trên toàn bộ .astro → bật lại (bảo vệ markup mới).
    files: ["**/*.astro"],
    rules: {
      "jsx-a11y/label-has-associated-control": "off",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
    },
  }
);
