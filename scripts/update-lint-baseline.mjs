// update-lint-baseline.mjs — cập nhật baseline SAU khi giảm nợ thành công.
// Chỉ chấp nhận khi tổng MỚI <= tổng CŨ (không cho phép tăng qua cửa này).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const resultsPath = join(root, ".eslint-warnings.json");
if (!existsSync(resultsPath)) {
  console.error("Chạy: eslint . --format json -o .eslint-warnings.json trước.");
  process.exit(1);
}
const current = JSON.parse(readFileSync(resultsPath, "utf8"));
const counts = {};
for (const f of current) {
  for (const m of f.messages) {
    if (m.severity === 1 && m.ruleId) counts[m.ruleId] = (counts[m.ruleId] || 0) + 1;
  }
}
const basePath = join(root, "artifacts/lint-baseline.json");
const old = JSON.parse(readFileSync(basePath, "utf8"));
const newTotal = Object.values(counts).reduce((a, b) => a + b, 0);
if (newTotal > old.total) {
  console.error(`TỪ CHỐI: ${newTotal} > baseline ${old.total} — nợ phải GIẢM trước khi cập nhật.`);
  process.exit(1);
}
writeFileSync(basePath, JSON.stringify({
  _comment: "Ratchet nợ lint (W-8) — con số mỗi rule CHỈ ĐƯỢC GIẢM. Tăng = lint gate fail. Sửa xong nhóm nào chạy npm run lint:baseline để cập nhật.",
  total: newTotal,
  rules: counts,
}, null, 2) + "\n", "utf8");
console.log(`baseline cập nhật: ${old.total} → ${newTotal}`);
try { const { unlinkSync } = await import("node:fs"); unlinkSync(resultsPath); } catch { /* ignore */ }
