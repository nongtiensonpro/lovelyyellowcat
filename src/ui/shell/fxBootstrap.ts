// fxBootstrap.ts — chạy sớm (script type=module head) để:
//  - đọc localStorage, set data-ui-mode lên <html> trước khi CSS render;
//  - thêm class fx-level cho FXBudget;
//  - giảm FOUC (no flash of unstyled state).
// SSR-safe: toàn bộ trong IIFE, không để lại biến global.
import { hydratePreferences, getPreferences, setUiMode } from "../services/preferenceStore";
import { computeFxLevel, readCapability, fxLevelToClass } from "../services/fxAbility";

(function bootShell(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  hydratePreferences();
  const p = getPreferences();

  // 1) gắn data-ui-mode (đổi semantic roles qua tokens.gen.css)
  document.documentElement.setAttribute("data-ui-mode", p.uiMode);
  // 2) font scale qua CSS custom property (tôn trọng user override)
  document.documentElement.style.setProperty("--user-font-scale", String(p.fontScale));
  // 3) density
  document.documentElement.setAttribute("data-density", p.density);
  // 4) FXBudget level
  const level = computeFxLevel({
    uiMode: p.uiMode,
    motionPref: p.motion,
    reducedMotionMedia: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    ...readCapability(),
  });
  document.documentElement.setAttribute("data-fx", level);
  document.documentElement.classList.add(fxLevelToClass(level));

  // 5) gắn kênh mở rộng — toggle nút CRT / mode switcher sẽ gọi setUiMode, FOUC fix luôn
  (window as unknown as { __lycSetUiMode?: (m: UiMode) => void }).__lycSetUiMode = (m) => {
    setUiMode(m);
    const next = getPreferences();
    document.documentElement.setAttribute("data-ui-mode", next.uiMode);
    const nextLevel = computeFxLevel({
      uiMode: next.uiMode,
      motionPref: next.motion,
      reducedMotionMedia: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
      ...readCapability(),
    });
    document.documentElement.setAttribute("data-fx", nextLevel);
    document.documentElement.classList.remove("fx-off", "fx-low", "fx-medium", "fx-high");
    document.documentElement.classList.add(fxLevelToClass(nextLevel));
  };
})();
import type { UiMode } from "../services/preferenceStore";
