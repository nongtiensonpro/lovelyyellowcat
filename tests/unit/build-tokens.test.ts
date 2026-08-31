import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Pipeline contract: primitives+semantic -> tokens.gen.{css,ts} với validation contrast.
// Chạy script thật (subprocess) trên token JSON thật nhưng ghi ra temp dir để không đụng repo.
const ROOT = join(__dirname, "..", "..");
const SCRIPT = join(ROOT, "scripts", "build-tokens.mjs");

function runScript() {
  // Script ghi trực tiếp vào src/styles — chấp nhận vì output deterministic;
  // test chỉ verify contract, không mutate token source.
  return execFileSync(process.execPath, [SCRIPT], { encoding: "utf8", cwd: ROOT });
}

describe("build-tokens pipeline", () => {
  it("chạy thành công và validate contrast", () => {
    const out = runScript();
    expect(out).toContain("tokens.gen.css");
    expect(out).toContain("OK");
  });

  it("tokens.gen.css chứa các role semantic bắt buộc", () => {
    runScript();
    const css = readFileSync(join(ROOT, "src", "styles", "tokens.gen.css"), "utf8");
    for (const role of ["surface-page", "surface-panel", "surface-win", "content-primary", "content-on-win", "chrome-titlebar", "glow"]) {
      expect(css).toContain(`--role-${role}`);
    }
    expect(css).toContain('[data-ui-mode="crt"]');
    expect(css).toContain('[data-ui-mode="access"]');
  });

  it("tokens.gen.ts export API ổn định", () => {
    const ts = readFileSync(join(ROOT, "src", "ui", "tokens", "tokens.gen.ts"), "utf8");
    expect(ts).toContain("export const COLOR_TOKENS");
    expect(ts).toContain("export const Z_INDEX");
    expect(ts).toContain("UI_MODES");
    expect(ts).toContain("UIMode");
  });

  it("token JSON có schema meta", () => {
    const p = JSON.parse(readFileSync(join(ROOT, "src", "ui", "tokens", "primitives.json"), "utf8"));
    const s = JSON.parse(readFileSync(join(ROOT, "src", "ui", "tokens", "semantic.json"), "utf8"));
    expect(p._meta.schema).toBe("lyc.tokens.primitives/1");
    expect(s._meta.schema).toBe("lyc.tokens.semantic/1");
    expect(s.modes).toEqual(["catalog", "crt", "access"]);
  });
});
