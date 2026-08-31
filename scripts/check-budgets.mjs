// check-budgets.mjs — Phase 9 budget gate (ratchet). Chạy SAU khi build.
// Dùng: node scripts/check-budgets.mjs  → exit 1 nếu vượt budgets (artifacts/ui-budgets.json).
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const budgets = JSON.parse(readFileSync(join(root, "artifacts/ui-budgets.json"), "utf-8"));
const dir = join(root, "build/client/_astro");
if (!existsSync(dir)) { console.error("build/client/_astro không tồn tại — chạy npm run build trước."); process.exit(1); }

const files = readdirSync(dir).filter((f) => /\.(js|css)$/.test(f));
const js = files.filter((f) => f.endsWith(".js"));
const css = files.filter((f) => f.endsWith(".css"));
const size = (list) => list.reduce((a, f) => a + statSync(join(dir, f)).size, 0);
const jsTotal = size(js), cssTotal = size(css);
const largest = js.length ? Math.max(...js.map((f) => statSync(join(dir, f)).size)) : 0;

// hydration directives từ src
let hyd = { "client:load": 0, "client:idle": 0, "client:visible": 0, "client:only": 0 };
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); const st = statSync(p); if (st.isDirectory()) walk(p); else if (f.endsWith(".astro")) { const t = readFileSync(p, "utf-8"); for (const k of Object.keys(hyd)) hyd[k] += (t.match(new RegExp(k, "g")) || []).length; } } };
walk(join(root, "src/pages"));

const failures = [];
const check = (name, actual, limit) => { const ok = actual <= limit; console.log(`${ok ? "✓" : "✗"} ${name}: ${actual} / ${limit}`); if (!ok) failures.push(name); };
const checkMin = (name, actual, limit) => { const ok = actual >= limit; console.log(`${ok ? "✓" : "✗"} ${name}: ${actual} / >= ${limit}`); if (!ok) failures.push(name); };

check("js_total_bytes", jsTotal, budgets.js_total_bytes);
check("js_largest_chunk_bytes", largest, budgets.js_largest_chunk_bytes);
check("css_total_bytes", cssTotal, budgets.css_total_bytes);
for (const [k, v] of Object.entries(budgets.hydration)) check(`hydration ${k}`, hyd[k] ?? 0, v);

// tests_min: đọc số test từ vitest output là tốn — thay bằng đếm file test tồn tại
const testFiles = (() => { let n = 0; const w = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) w(p); else if (/\.test\.tsx?$/.test(f)) n++; } }; if (existsSync(join(root, "tests"))) w(join(root, "tests")); return n; })();
checkMin("test_files", testFiles, budgets.test_files_min ?? 20);
failures.length ? (console.error("BUDGET FAIL:", failures.join(", ")), process.exit(1)) : console.log("BUDGET OK");
