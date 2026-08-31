#!/usr/bin/env node
// check-ui-policy.mjs — gate chặn hex/arbitrary MỚI trong markup/class (ADR-0001).
// Phạm vi: .astro/.tsx chỉ phần markup + className string (không tính <style>, string nội dung,
// file non-UI như lib/emailNotification.ts). global.css là legacy allowlist theo ADR.
// Cho phép "hex đủ 4 chữ số của token": token value nằm trong primitives.json.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const allow = JSON.parse(readFileSync(join(ROOT, "src", "ui", "tokens", "token-allowlist.json"), "utf8"));

// Màu token hợp lệ (primitives.color values) — hex nằm trong đây không tính violation
const primitives = JSON.parse(readFileSync(join(ROOT, "src", "ui", "tokens", "primitives.json"), "utf8"));
const TOKEN_VALUES = new Set(Object.values(primitives.color).map((c) => c.value.toLowerCase()));

const HEX = /#[0-9a-fA-F]{3,8}\b/g;

// File UI markup (bỏ style block) — nơi KHÔNG được thêm hex mới
const UI_DIRS = ["src/components", "src/layouts", "src/pages", "src/ui"];
const SKIP_FILES = new Set([
  // Non-UI hoặc đã có kế hoạch riêng (email template, middleware inline style, security token)
  "src/lib/emailNotification.ts",
  "src/middleware.ts",
  "src/lib/aiCrypto.ts",
  "src/pages/ai-security.astro",
]);

function listFiles(dir) {
  const acc = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) acc.push(...listFiles(p));
    else acc.push(p);
  }
  return acc;
}

function stripStyleBlocks(text) {
  return text.replace(/<style[\s\S]*?<\/style>/g, "");
}

const violations = [];
for (const dir of UI_DIRS) {
  for (const f of listFiles(join(ROOT, dir))) {
    const rel = relative(ROOT, f).replaceAll("\\", "/");
    const ext = extname(f);
    if (![".astro", ".tsx", ".ts"].includes(ext)) continue;
    if (SKIP_FILES.has(rel)) continue;
    if (rel === "src/styles/tokens.gen.css") continue;

    const allowEntry = allow.entries.find((e) => e.file === rel);
    let text = readFileSync(f, "utf8");
    if (ext === ".astro") text = stripStyleBlocks(text);
    // bỏ comment
    text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*/gm, "").replace(/<!--[\s\S]*?-->/g, "");

    for (const m of text.matchAll(HEX)) {
      const hex = m[0].toLowerCase();
      if (TOKEN_VALUES.has(hex)) continue; // hex trùng giá trị token vẫn không chuẩn — nhưng chưa chặn gấp
      // Fingerprint-based allowlist (line numbers drift khi sửa file — dùng hex+file)
      if (allowEntry?.hexes?.includes(hex)) continue;
      violations.push({ file: rel, hex: m[0] });
    }
  }
}

if (violations.length) {
  // Chế độ report: chỉ fail nếu số violation TĂNG so với file hiện có (ratchet)
  const baselinePath = join(ROOT, "artifacts", "ui-policy-count.json");
  let prev = null;
  try { prev = JSON.parse(readFileSync(baselinePath, "utf8")); } catch {}
  const current = violations.length;
  if (prev && typeof prev.count === "number" && current > prev.count) {
    console.error(`check-ui-policy: FAIL — hex markup tăng ${prev.count} -> ${current}`);
    for (const v of violations.slice(prev.count)) console.error(`  + ${v.file}: ${v.hex}`);
    process.exit(1);
  }
  console.log(`check-ui-policy: ${current} hex có sẵn (ratchet, giới hạn ${prev?.count ?? "∞"}) — PASS`);
  process.exit(0);
}
console.log("check-ui-policy: 0 hex trong markup — PASS");
