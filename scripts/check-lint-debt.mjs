// check-lint-debt.mjs — ratchet nợ lint (W-8). Chạy SAU eslint (npm run lint).
// Đọc artifacts/lint-baseline.json; eslint phải chạy trước với --format json ghi ra .eslint-warnings.json
// Mọi rule vượt baseline → exit 1 (nợ TĂNG bị chặn). Giảm được → khuyến khích cập nhật baseline mới.
// v5.2: logic per-rule tách vào lint-baseline-core.mjs — có test hồi quy chặn lỗ hổng "tổng giảm nhưng 1 rule tăng".
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { countWarnings, totalOf, checkRatchet } from "./lint-baseline-core.mjs";

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
const counts = countWarnings(current);

// In diễn biến từng rule trong baseline để CI log dễ đọc
for (const [rule, base] of Object.entries(baseline.rules)) {
  const now = counts[rule] ?? 0;
  const ok = now <= base;
  console.log(`${ok ? "✓" : "✗"} ${rule}: ${now} / ${base}`);
}

const failures = checkRatchet(baseline, counts);
try { unlinkSync(resultsPath); } catch { /* ignore */ }
if (failures.length > 0) {
  console.error("LINT DEBT TĂNG:", failures.join(", "));
  console.error("Sửa lỗi mới hoặc cập nhật baseline có chủ đích: npm run lint:baseline");
  process.exit(1);
}
console.log(`LINT DEBT OK (tổng hiện tại: ${totalOf(counts)} / baseline ${baseline.total})`);
