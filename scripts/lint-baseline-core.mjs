// lint-baseline-core.mjs — logic ratchet nợ lint thuần, dùng chung check-lint-debt.mjs,
// update-lint-baseline.mjs và tests/unit/lintBaselineCore.test.ts.
// Bài học v5.2 (audit): chỉ so TỔNG là lỗ hổng — rule A tăng 1→2, rule B giảm 3→1,
// tổng 4→3 vẫn "giảm" và được chấp nhận dù nợ thật đã tăng ở rule A.
// Luật: MỖI rule chỉ được GIẢM. Tăng ở bất kỳ rule nào (kể cả rule mới xuất hiện) = vi phạm.

/**
 * Đếm warning theo ruleId từ output JSON của ESLint (`eslint . --format json`).
 * Bỏ qua: severity !== 1 (error làm eslint exit != 0 — không cần ratchet),
 * và message không có ruleId (vd. cảnh báo file ignored — không phải nợ).
 * @param {Array<{messages: Array<{severity: number, ruleId: string | null}>}>} results
 * @returns {Record<string, number>}
 */
export function countWarnings(results) {
  const counts = {};
  for (const file of results) {
    for (const m of file.messages ?? []) {
      if (m.severity === 1 && m.ruleId) {
        counts[m.ruleId] = (counts[m.ruleId] ?? 0) + 1;
      }
    }
  }
  return counts;
}

/**
 * @param {Record<string, number>} counts
 * @returns {number}
 */
export function totalOf(counts) {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

/**
 * So warning hiện tại với baseline. Rỗng = pass.
 * Vi phạm 2 loại: (1) rule cũ tăng, (2) rule mới xuất hiện (baseline=0 → mọi warning mới fail).
 * @param {{total: number, rules: Record<string, number>}} baseline
 * @param {Record<string, number>} counts
 * @returns {string[]}
 */
export function checkRatchet(baseline, counts) {
  const failures = [];
  const baseRules = baseline.rules ?? {};
  for (const [rule, base] of Object.entries(baseRules)) {
    const now = counts[rule] ?? 0;
    if (now > base) failures.push(`${rule} (${now} > ${base})`);
  }
  for (const rule of Object.keys(counts)) {
    if (!(rule in baseRules)) failures.push(`${rule} mới xuất hiện (${counts[rule]})`);
  }
  return failures;
}
