// pongCore.ts — physics Vapor Pong thuần (không DOM/canvas) để unit test 100%.
// Hệ trục 960×540 (16:9 widescreen, khớp canvas). Màu chỉ nằm ở render (component).

export interface PongInput {
  up: boolean;
  down: boolean;
  mouseY: number | null;
}

export interface PongState {
  ballX: number;
  ballY: number;
  velX: number;
  velY: number;
  playerY: number; // đỉnh paddle trái (P1)
  cpuY: number; // đỉnh paddle phải (CPU)
  score: number;
  cool: number; // frame cooldown sau khi qua CPU — serve tiếp
  flash: number; // 1 khi vừa chặn paddle → render vẽ flash, decay về 0
  trail: Array<{ x: number; y: number }>; // vệt bóng gần nhất (render-only, core ghi)
  t: number; // thời gian mô phỏng tăng mỗi step (render dựa vào sin/cos)
}

export const PONG_W = 960;
export const PONG_H = 540;
export const PAD_H = 80;
export const PAD_W = 12;
const BALL = 12;
const START_SPEED = 6.3; // 16:9 rộng hơn → tốc độ scale tương ứng
const SPEEDUP = 1.045;
const CPU_MAX = 4.6;
const PLAYER_SPEED = 9;
const VEL_Y_MAX = 10.5;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function clampSym(v: number, max: number): number {
  return clamp(v, -max, max);
}

/** Trạng thái khởi đầu: bóng giữa sân, paddle giữa, hướng về CPU. */
export function init(): PongState {
  return {
    ballX: PONG_W / 2,
    ballY: PONG_H / 2,
    velX: START_SPEED,
    velY: 1.8,
    playerY: (PONG_H - PAD_H) / 2,
    cpuY: (PONG_H - PAD_H) / 2,
    score: 0,
    cool: 0,
    flash: 0,
    trail: [],
    t: 0,
  };
}

/** Serve lại giữa sân; hướng bóng về phía `towardCpu`. */
export function serve(s: PongState, towardCpu: boolean): void {
  s.ballX = PONG_W / 2;
  s.ballY = PONG_H / 2;
  s.velX = towardCpu ? START_SPEED : -START_SPEED;
  // Góc serve ngẫu nhiên (±) — không còn bóng thẳng giữa dễ đoán
  s.velY = (Math.random() - 0.5) * 3.2;
  s.cool = 0;
}

const TRAIL_MAX = 14;

/** Một bước mô phỏng (1 rAF frame). Mutate tại chỗ, trả về state. */
export function step(s: PongState, input: PongInput): PongState {
  s.t += 1;
  s.flash *= 0.88;
  if (s.flash < 0.02) s.flash = 0;
  // ── P1: chuột ưu tiên, phím phụ
  if (input.mouseY !== null) {
    s.playerY = clamp(input.mouseY - PAD_H / 2, 0, PONG_H - PAD_H);
  } else {
    const v = (input.down ? PLAYER_SPEED : 0) - (input.up ? PLAYER_SPEED : 0);
    s.playerY = clamp(s.playerY + v, 0, PONG_H - PAD_H);
  }
  // ── CPU bám bóng như người chơi thật: chỉ track khi bóng bay về phía mình,
  // bóng đi xa thì drift về giữa chuẩn bị. Skill tăng nhẹ theo điểm (rubber-band arcade).
  const skill = Math.min(0.085 + s.score * 0.004, 0.13);
  if (s.velX > 0) {
    const target = s.ballY - PAD_H / 2;
    s.cpuY = clamp(s.cpuY + clampSym((target - s.cpuY) * skill, CPU_MAX), 0, PONG_H - PAD_H);
  } else {
    const mid = (PONG_H - PAD_H) / 2;
    s.cpuY = clamp(s.cpuY + clampSym((mid - s.cpuY) * 0.03, 1.6), 0, PONG_H - PAD_H);
  }
  // ── cooldown giữa các cú ghi điểm
  if (s.cool > 0) {
    s.cool -= 1;
    return s;
  }
  // ── bóng di chuyển + trail
  s.trail.push({ x: s.ballX, y: s.ballY });
  if (s.trail.length > TRAIL_MAX) s.trail.shift();
  s.ballX += s.velX;
  s.ballY += s.velY;
  // tường trên/dưới nảy
  if (s.ballY < BALL / 2) {
    s.ballY = BALL / 2;
    s.velY = Math.abs(s.velY);
  }
  if (s.ballY > PONG_H - BALL / 2) {
    s.ballY = PONG_H - BALL / 2;
    s.velY = -Math.abs(s.velY);
  }
  // ── paddle trái (P1) chặn
  if (
    s.velX < 0 &&
    s.ballX - BALL / 2 <= PAD_W &&
    s.ballX - BALL / 2 >= 0 &&
    s.ballY >= s.playerY - BALL / 2 &&
    s.ballY <= s.playerY + PAD_H + BALL / 2
  ) {
    s.ballX = PAD_W + BALL / 2;
    s.velX = Math.abs(s.velX) * SPEEDUP;
    s.velY += ((s.ballY - (s.playerY + PAD_H / 2)) / (PAD_H / 2)) * 2.2;
    s.velY = clampSym(s.velY, VEL_Y_MAX);
    s.flash = 1;
  }
  // ── paddle phải (CPU) chặn
  if (
    s.velX > 0 &&
    s.ballX + BALL / 2 >= PONG_W - PAD_W &&
    s.ballX + BALL / 2 <= PONG_W &&
    s.ballY >= s.cpuY - BALL / 2 &&
    s.ballY <= s.cpuY + PAD_H + BALL / 2
  ) {
    s.ballX = PONG_W - PAD_W - BALL / 2;
    s.velX = -Math.abs(s.velX) * SPEEDUP;
    s.velY += ((s.ballY - (s.cpuY + PAD_H / 2)) / (PAD_H / 2)) * 2.2;
    s.velY = clampSym(s.velY, VEL_Y_MAX);
    s.flash = 1;
  }
  // ── bóng qua CPU → P1 ĐIỂM; serve về phía thua (P1 giao lại — chuẩn Pong)
  if (s.ballX > PONG_W + BALL) {
    s.score += 1;
    serve(s, true);
    s.cool = 45;
  }
  // ── bóng qua P1 → thua mạng: reset điểm
  if (s.ballX < -BALL) {
    s.score = 0;
    serve(s, false);
    s.cool = 45;
  }
  return s;
}

/** Reset hoàn toàn (nút chơi lại). */
export function reset(): PongState {
  return init();
}
