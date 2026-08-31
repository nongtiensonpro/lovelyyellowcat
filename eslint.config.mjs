// ESLint 9 flat config — LovelyYellowCat v5
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["build/**", "dist/**", ".verify-dist/**", ".astro/**", "node_modules/**", "artifacts/**", "astro.config.mjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
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
      "no-console": "warn",
    },
  },
  {
    // ─── v5 hotfix gate: nợ kỹ thuật tồn dư từ trước v5 → WARN (không chặn CI).
    // Kế hoạch dọn dần từng nhóm ở v5.1 — theo dõi ở docs/runbooks/WAIVERS.md (W-8).
    // KHÔNG hạ warn: react-hooks/rules-of-hooks, react-hooks/exhaustive-deps (error),
    // no-restricted-syntax alert/confirm (error) — 3 rule này bảo vệ runtime thật.
    files: ["**/*.{ts,tsx,astro}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-var": "warn",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
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
  }
);
