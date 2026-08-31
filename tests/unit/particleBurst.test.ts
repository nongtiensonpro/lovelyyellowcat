import { describe, it, expect } from "vitest";
import { spawnBurst, stepParticles, type Particle } from "../../src/components/article/particleBurst";

describe("spawnBurst", () => {
  it("đúng số lượng + field hợp lệ", () => {
    const rng = () => 0.5; // deterministic
    const ps = spawnBurst("🌸", 100, 200, 12, rng);
    expect(ps).toHaveLength(12);
    for (const p of ps) {
      expect(p.emoji).toBe("🌸");
      expect(p.x).toBe(100);
      expect(p.y).toBe(200);
      expect(p.angle).toBeCloseTo(180); // 0.5*360
      expect(p.velocity).toBeGreaterThan(0);
      expect(p.opacity).toBe(1);
    }
  });
  it("id tăng dần duy nhất", () => {
    const ps = spawnBurst("💾", 0, 0, 5);
    const ids = ps.map((p) => p.id);
    expect(new Set(ids).size).toBe(5);
  });
});

describe("stepParticles", () => {
  it("di chuyển theo angle + gravity, friction giảm velocity", () => {
    const p: Particle = { id: 1, emoji: "x", x: 0, y: 0, angle: 0, velocity: 2, opacity: 1, scale: 1 };
    const [next] = stepParticles([p]);
    expect(next.x).toBeCloseTo(2); // cos(0)*2
    expect(next.y).toBeCloseTo(0.3); // sin(0)*2 + gravity
    expect(next.velocity).toBeCloseTo(2 * 0.96);
    expect(next.opacity).toBeCloseTo(0.98);
    expect(next.scale).toBeCloseTo(0.98);
  });
  it("loại hạt opacity ≤ 0", () => {
    const p: Particle = { id: 1, emoji: "x", x: 0, y: 0, angle: 0, velocity: 1, opacity: 0.01, scale: 1 };
    expect(stepParticles([p])).toHaveLength(0);
  });
  it("không mutate input", () => {
    const p: Particle = { id: 1, emoji: "x", x: 0, y: 0, angle: 0, velocity: 2, opacity: 1, scale: 1 };
    stepParticles([p]);
    expect(p.x).toBe(0);
  });
});
