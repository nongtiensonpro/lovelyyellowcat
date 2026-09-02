// pongCore.ts — physics Vapor Pong thuần (không DOM/canvas) để unit test 100%.
// Hệ trục 640x480 (khớp canvas). Màu chỉ nằm ở render (component).

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
}

export const PONG_W = 640;
export const PONG_H = 480;
export const PAD_H = 80;
export const PAD_W = 12;
const BALL = 12;
const START_SPEED = 4.2;
const SPEEDUP = 1.045;
const CPU_MAX = 3.1;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function clampSym(v: number, max: number): number {
  return clamp(v, -max, max);
}

/** Trạng thái khởi đầu: bóng hướng về CPU, paddle giữa. */
export function init(): PongState {
  return {
    ballX: 320,
    ballY: 240,
    velX: START_SPEED,
    velY: 1.2,
    playerY: 200,
    cpuY: 200,
    score: 0,
    cool: 0,
  };
}

/** Serve lại giữa sân; hướng bóng về phía `towardCpu`. */
export function serve(s: PongState, towardCpu: boolean): void {
  s.ballX = 320;
  s.ballY = 240;
  s.velX = towardCpu ? START_SPEED : -START_SPEED;
  s.velY = 0;
  s.cool = 0;
}

/** Một bước mô phỏng (1 rAF frame). Trả về state (mutate tại chỗ). */
export function step(s: PongState, input: PongInput): PongState {
  // ── P1: chuột ưu tiên, phím phụ
  if (input.mouseY !== null) {
    s.playerY = clamp(input.mouseY - PAD_H / 2, 0, PONG_H - PAD_H);
  } else {
    const v = (input.down ? 6 : 0) - (input.up ? 6 : 0);
    s.playerY = clamp(s.playerY + v, 0, PONG_H - PAD_H);
  }
  // ── CPU bám bóng (giới hạn tốc độ — thắng được nhưng không bender)
  const target = s.ballY - PAD_H / 2;
  s.cpuY = clamp(s.cpuY + clampSym((target - s.cpuY) * 0.09, CPU_MAX), 0, PONG_H - PAD_H);
  // ── cooldown giữa các cú ghi điểm
  if (s.cool > 0) {
    s.cool -= 1;
    return s;
  }
  // ── bóng di chuyển
  s.ballX += s.velX;
  s.ballY += s.velY;
  // tường trên/dưới
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
    s.velY += ((s.ballY - (s.playerY + PAD_H / 2)) / (PAD_H / 2)) * 1.6;
    s.velY = clampSym(s.velY, 7);
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
    s.velY += ((s.ballY - (s.cpuY + PAD_H / 2)) / (PAD_H / 2)) * 1.6;
    s.velY = clampSym(s.velY, 7);
  }
  // ── bóng qua CPU → ĐIỂM cho P1 + serve về P1 (đánh chậm lại)
  if (s.ballX > PONG_W + BALL) {
    s.score += 1;
    serve(s, true);
    s.cool = 45;
  }
  // ── bóng qua P1 → thua: reset điểm (Pong arcade: một mạng)
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
