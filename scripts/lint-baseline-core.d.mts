// Declarations cho scripts/lint-baseline-core.mjs (tsc không parse được JSDoc từ .mjs).
export declare function countWarnings(
  results: Array<{ messages?: Array<{ severity: number; ruleId: string | null }> }>,
): Record<string, number>;
export declare function totalOf(counts: Record<string, number>): number;
export declare function checkRatchet(
  baseline: { total: number; rules: Record<string, number> },
  counts: Record<string, number>,
): string[];
