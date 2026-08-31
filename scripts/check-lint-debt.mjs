// check-lint-debt.mjs — ratchet nợ lint (W-8). Chạy SAU eslint (npm run lint:debt).
// Đọc artifacts/lint-baseline.json; eslint phải chạy trước với --format json ghi ra .eslint-warnings.json
// Mọi rule vượt baseline → exit 1 (nợ TĂNG bị chặn). Giảm được → khuyến khích cập nhật baseline mới.
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const basePath = join(root, "artifacts/lint-baseline.json");
if (!existsSync(basePath)) {
  console.error("Thiếu artifacts/lint-baseline.json — file ratchet phải được commit (đừng gitignore artifacts/).");
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(basePath, "utf8"));

const resultsPath = join(root, ".eslint-warnings.json");
if (!existsSync(resultsPath)) {
  console.error("Thiếu .eslint-warnings.json — chạy: eslint . --format json -o .eslint-warnings.json trước.");
  process.exit(1);
}
const current = JSON.parse(readFileSync(resultsPath, "utf8"));
const counts = {};
for (const f of current) {
  for (const m of f.messages) {
    if (m.severity === 1 && m.ruleId) counts[m.ruleId] = (counts[m.ruleId] || 0) + 1;
  }
}
const failures = [];
for (const [rule, base] of Object.entries(baseline.rules)) {
  const now = counts[rule] || 0;
  const ok = now <= base;
  console.log(`${ok ? "✓" : "✗"} ${rule}: ${now} / ${base}`);
  if (!ok) failures.push(`${rule} (${now} > ${base})`);
}
// rule mới xuất hiện (chưa có baseline) cũng bị chặn
for (const [rule, now] of Object.entries(counts)) {
  if (!(rule in baseline.rules)) failures.push(`${rule} mới xuất hiện (${now})`);
}
try { unlinkSync(resultsPath); } catch { /* ignore */ }
if (failures.length > 0) {
  console.error("LINT DEBT TĂNG:", failures.join(", "));
  console.error("Sửa lỗi mới hoặc cập nhật baseline có chủ đích: npm run lint:baseline");
  process.exit(1);
}
console.log(`LINT DEBT OK (tổng hiện tại: ${Object.values(counts).reduce((a, b) => a + b, 0)} / baseline ${baseline.total})`);
