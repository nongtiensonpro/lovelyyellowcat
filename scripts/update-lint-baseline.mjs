// update-lint-baseline.mjs — cập nhật baseline SAU khi giảm nợ thành công.
// Chỉ chấp nhận khi KHÔNG rule nào tăng so với baseline cũ (kể cả rule mới xuất hiện)
// — không cho phép tăng qua cửa này. v5.2: trước đây chỉ so tổng (lỗ hổng: rule A
// tăng + rule B giảm nhiều → tổng giảm → vẫn được ghi nhận).
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { countWarnings, totalOf, checkRatchet } from "./lint-baseline-core.mjs";

const root = process.cwd();
const resultsPath = join(root, ".eslint-warnings.json");
if (!existsSync(resultsPath)) {
  console.error("Chạy: eslint . --format json -o .eslint-warnings.json trước.");
  process.exit(1);
}
const current = JSON.parse(readFileSync(resultsPath, "utf8"));
const counts = countWarnings(current);

const basePath = join(root, "artifacts/lint-baseline.json");
const old = JSON.parse(readFileSync(basePath, "utf8"));

const newTotal = totalOf(counts);
const ratchetFailures = checkRatchet(old, counts);
if (ratchetFailures.length > 0 || newTotal > old.total) {
  console.error(`TỪ CHỐI cập nhật baseline — vi phạm ratchet: ${ratchetFailures.join(", ") || `${newTotal} > ${old.total}`}`);
  console.error("Mỗi rule chỉ được GIẢM trước khi cập nhật baseline.");
  process.exit(1);
}
writeFileSync(basePath, JSON.stringify({
  _comment: "Ratchet nợ lint (W-8) — con số mỗi rule CHỈ ĐƯỢC GIẢM. Tăng = lint gate fail. Sửa xong nhóm nào chạy npm run lint:baseline để cập nhật.",
  total: newTotal,
  rules: counts,
}, null, 2) + "\n", "utf8");
console.log(`baseline cập nhật: ${old.total} → ${newTotal}`);
try { unlinkSync(resultsPath); } catch { /* ignore */ }
