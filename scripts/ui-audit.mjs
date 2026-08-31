#!/usr/bin/env node
// ui-audit.mjs — Phase 0 baseline scanner cho LovelyYellowCat v5 ULTIMATE OVERENGINEER
// Đo nợ UI trong src/**/*.{astro,tsx,ts,css} và xuất artifacts/ui-baseline.json.
// Deterministic: cùng cây src => cùng JSON (không dùng thời gian hệ thống).

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "artifacts", "ui-baseline.json");
const EXT = new Set([".astro", ".tsx", ".ts", ".css"]);

function listFiles(dir) {
  const acc = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (EXT.has(extname(e.name))) acc.push(p);
    }
  };
  walk(dir);
  return acc.sort();
}

// ── Pattern library (giữ nguyên khi so sánh baseline giữa các lần chạy) ──
const PATTERNS = {
  hex_literal: /#[0-9a-fA-F]{3,8}\b/g,
  rgb_literal: /\brgba?\(\s*\d/g,
  arbitrary_tailwind: /\[[^\]{}]*\]/g,
  inline_style: /\bstyle\s*=/g,
  // Chỉ đếm call thật của alert()/confirm() — bỏ qua uiAlert/uiConfirm/comment
  native_alert: /(?<![\w.$])alert\s*\(/g,
  native_confirm: /(?<![\w.$])confirm\s*\(/g,
  img_tag: /<img\b/g,
  img_srcset: /\bsrcset\b/g,
  client_load: /client:load/g,
  client_visible: /client:visible/g,
  client_idle: /client:idle/g,
  z_adhoc: /z-\[(?!var\()999+\]/g,
  role_dialog: /role\s*=\s*["']dialog["']/g,
  aria_live: /aria-live/g,
  focus_visible: /:focus-visible/g,
  any_cast: /:\s*any\b|\bas\s+any\b/g,
  win95_container: /win95-container/g,
  win95_btn: /win95-btn/g,
  win95_header: /win95-header/g,
  localStorage_direct: /localStorage\.(get|set|remove)Item/g,
  webgl: /\bWebGL(Rendering)?Context\b|getContext\(\s*["']webgl/g,
  intersection_observer: /IntersectionObserver/g,
  prefers_reduced_motion: /prefers-reduced-motion/g,
  container_query: /@container/g,
  layer_rule: /@layer/g,
};

// File lớn cần chi tiết hoá (theo kế hoạch §1.5)
const HOTSPOTS = [
  "src/components/AiChatStation.tsx",
  "src/components/GalleryLightbox.tsx",
  "src/components/GalleryGrid.tsx",
  "src/components/ServerStatusWidget.astro",
  "src/pages/about.astro",
  "src/pages/articles/[slug].astro",
  "src/pages/admin/media.astro",
  "src/layouts/BaseLayout.astro",
  "src/layouts/AdminLayout.astro",
  "src/styles/global.css",
];

const files = listFiles(SRC);
let loc = 0;
const total = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0]));
const perFile = {};
const hotspotDetails = [];

// Strip comment theo loại file trước khi đếm — comment không phải call thật
function stripComments(text, ext) {
  if (ext === ".css") return text.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = text.replace(/\/\*[\s\S]*?\*\//g, "");
  out = out.replace(/^\s*\/\/[^\n]*/gm, "");
  out = out.replace(/<!--[\s\S]*?-->/g, ""); // HTML comment (.astro)
  return out;
}

for (const f of files) {
  const rel = relative(ROOT, f).replaceAll("\\", "/");
  const text = stripComments(readFileSync(f, "utf8"), extname(f));
  loc += text.split("\n").length;
  const counts = {};
  for (const [name, re] of Object.entries(PATTERNS)) {
    const m = text.match(re);
    counts[name] = m ? m.length : 0;
    total[name] += counts[name];
  }
  perFile[rel] = counts;
  if (HOTSPOTS.includes(rel)) {
    hotspotDetails.push({ file: rel, loc: text.split("\n").length, counts });
  }
}

// Fingerprint để phát hiện cây mã nguồn đổi giữa các lần chạy
const treeHash = createHash("sha256");
for (const f of files) {
  treeHash.update(relative(ROOT, f).replaceAll("\\", "/"));
  treeHash.update("\0");
  treeHash.update(createHash("sha256").update(readFileSync(f)).digest("hex"));
  treeHash.update("\0");
}

const report = {
  schema: "lyc.ui-baseline/1",
  notes: "Deterministic. Cùng cây src => cùng JSON. Điểm chuẩn so sánh sau refactor.",
  srcRoot: "src",
  fileCount: files.length,
  loc,
  totals: total,
  hotspots: hotspotDetails,
  sourceTreeSha256: treeHash.digest("hex"),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(`ui-audit: ${files.length} files, ${loc} LOC -> ${relative(ROOT, OUT)}`);
console.log(`  hex=${total.hex_literal} arbitrary=${total.arbitrary_tailwind} style=${total.inline_style}`);
console.log(`  alert=${total.native_alert} confirm=${total.native_confirm} img=${total.img_tag} srcset=${total.img_srcset}`);
console.log(`  client:load=${total.client_load} z-adhoc=${total.z_adhoc} any=${total.any_cast}`);
