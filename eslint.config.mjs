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
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  }
);
