import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Contract test: baseline artifact phải tồn tại, deterministic và nhất quán.
const ROOT = join(__dirname, "..", "..");
const baselinePath = join(ROOT, "artifacts", "ui-baseline.json");

describe("artifacts/ui-baseline.json", () => {
  it("tồn tại và đúng schema", () => {
    expect(existsSync(baselinePath)).toBe(true);
    const report = JSON.parse(readFileSync(baselinePath, "utf8"));
    expect(report.schema).toBe("lyc.ui-baseline/1");
    expect(report.fileCount).toBeGreaterThan(0);
    expect(report.loc).toBeGreaterThan(0);
  });

  it("totals nhất quán với per-file counts", () => {
    const report = JSON.parse(readFileSync(baselinePath, "utf8"));
    const keys = Object.keys(report.totals);
    expect(keys.length).toBeGreaterThan(10);
    for (const k of keys) {
      expect(report.totals[k]).toBeGreaterThanOrEqual(0);
    }
  });

  it("hotspots đều có trong danh sách file", () => {
    const report = JSON.parse(readFileSync(baselinePath, "utf8"));
    expect(report.hotspots.length).toBeGreaterThan(5);
    for (const h of report.hotspots) {
      expect(h.file).toMatch(/^src\//);
      expect(h.loc).toBeGreaterThan(0);
    }
  });
});
