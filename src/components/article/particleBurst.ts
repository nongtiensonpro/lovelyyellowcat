// particleBurst.ts — pure particle physics cho ReactionBar (Phase 5).
// Tách từ ReactionBar.tsx — cùng hằng số friction/gravity/fade của bản cũ.

export interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  angle: number; // độ
  velocity: number;
  opacity: number;
  scale: number;
}

const GRAVITY = 0.3;
const FRICTION = 0.96;
const FADE = 0.02;
const SHRINK = 0.98;

let _idCounter = 0;

/** Spawn burst từ tâm nút — random góc/độ nhanh như bản cũ (Math.random caller inject được). */
export function spawnBurst(
  emoji: string,
  originX: number,
  originY: number,
  count: number,
  rng: () => number = Math.random
): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * 360;
    const velocity = 2 + rng() * 3;
    out.push({
      id: ++_idCounter,
      emoji,
      x: originX,
      y: originY,
      angle,
      velocity,
      opacity: 1,
      scale: 0.8 + rng() * 0.6,
    });
  }
  return out;
}

/** Một bước vật lý: cộng gravity, friction, fade; loại hạt opacity ≤ 0. */
export function stepParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => {
      const rad = (p.angle * Math.PI) / 180;
      return {
        ...p,
        x: p.x + Math.cos(rad) * p.velocity,
        y: p.y + Math.sin(rad) * p.velocity + GRAVITY,
        velocity: p.velocity * FRICTION,
        opacity: p.opacity - FADE,
        scale: p.scale * SHRINK,
      };
    })
    .filter((p) => p.opacity > 0);
}
