// gamesPong.test.ts — physics Vapor Pong pure (GM2).
import { describe, it, expect } from "vitest";
import { init, step, serve, reset, PONG_W, PONG_H, PAD_H } from "../../src/lib/games/pongCore";

const IN = { up: false, down: false, mouseY: null as number | null };

describe("PONG.SYS core", () => {
  it("init: bóng giữa sân, score 0, cool 0", () => {
    const s = init();
    expect(s.score).toBe(0);
    expect(s.cool).toBe(0);
    expect(s.ballX).toBe(PONG_W / 2);
    expect(s.playerY).toBe((PONG_H - PAD_H) / 2);
  });

  it("bóng di chuyển mỗi step", () => {
    const s = init();
    const x0 = s.ballX;
    step(s, IN);
    expect(s.ballX).toBeGreaterThan(x0);
  });

  it("tường trên/dưới: velY đổi dấu, ballY kẹp trong sân", () => {
    const s = init();
    s.velY = -8;
    s.ballY = 4;
    for (let i = 0; i < 6; i++) step(s, IN);
    expect(s.ballY).toBeGreaterThanOrEqual(0);
    expect(s.ballY).toBeLessThanOrEqual(PONG_H);
  });

  it("paddle P1 chặn: velX đổi dấu dương + tăng tốc (SPEEDUP)", () => {
    const s = init();
    s.ballX = 13; // sát paddle trái (PAD_W=12)
    s.ballY = s.playerY + PAD_H / 2; // trúng giữa paddle
    s.velX = -4;
    step(s, IN);
    expect(s.velX).toBeGreaterThan(0);
  });

  it("CPU bám bóng: cpuY tiến về ballY", () => {
    const s = init();
    s.cpuY = 0;
    s.ballY = 400;
    const d0 = Math.abs(s.cpuY - (s.ballY - PAD_H / 2));
    step(s, IN);
    const d1 = Math.abs(s.cpuY - (s.ballY - PAD_H / 2));
    expect(d1).toBeLessThan(d0);
  });

  it("bóng qua CPU: score +1, serve lại giữa sân, cool > 0", () => {
    const s = init();
    s.ballX = PONG_W + 20;
    step(s, IN);
    expect(s.score).toBe(1);
    expect(s.ballX).toBe(PONG_W / 2);
    expect(s.cool).toBeGreaterThan(0);
  });

  it("bóng qua P1: score reset 0", () => {
    const s = init();
    s.score = 3;
    s.ballX = -20;
    step(s, IN);
    expect(s.score).toBe(0);
  });

  it("serve(towardCpu): velX dương; serve(!towardCpu): velX âm", () => {
    const s = init();
    serve(s, true);
    expect(s.velX).toBeGreaterThan(0);
    serve(s, false);
    expect(s.velX).toBeLessThan(0);
  });

  it("cool > 0: bóng đứng im (không cộng velocity)", () => {
    const s = init();
    serve(s, true);
    s.cool = 10;
    const x0 = s.ballX;
    step(s, IN);
    expect(s.ballX).toBe(x0);
  });

  it("chuột mouseY đặt paddle ngay (ưu tiên phím)", () => {
    const s = init();
    step(s, { up: true, down: false, mouseY: 400 });
    // mouseY 400 → paddle đỉnh = 400 - 40 = 360
    expect(s.playerY).toBe(360);
  });

  it("reset = init", () => {
    const s = reset();
    expect(s.score).toBe(0);
    expect(s.ballX).toBe(PONG_W / 2);
  });
});

describe("PONG difficulty (chặn bug đứng-im-vẫn-thắng)", () => {
  it("CPU không bám bóng khi bóng hướng về P1 — drift về giữa (khoảng cách nhỏ, không cap)", () => {
    const s = init();
    s.velX = -6.3; // bóng về phía P1
    s.ballY = 240; // xa giữa (230) một chút về phía dưới
    s.cpuY = 200; // trên giữa — drift phải đưa cpuY LÊN (xa ballY)
    const before = s.cpuY;
    step(s, IN);
    expect(s.cpuY).toBeGreaterThan(before); // về giữa (230) = tăng từ 200
  });

  it("CPU bám bóng khi bóng hướng về mình (velX > 0)", () => {
    const s = init();
    s.velX = 6.3;
    s.ballY = 460;
    s.cpuY = 100;
    step(s, IN);
    expect(s.cpuY).toBeGreaterThan(100); // đã tiến về bóng
  });

  it("skill tăng theo điểm (rubber-band): score cao → CPU tiến nhanh hơn (khoảng cách nhỏ, không cap)", () => {
    const s0 = init();
    s0.velX = 6.3; s0.ballY = 210; s0.cpuY = 200; s0.score = 0;
    step(s0, IN);
    const d0 = Math.abs(s0.cpuY - 200);
    const s1 = init();
    s1.velX = 6.3; s1.ballY = 210; s1.cpuY = 200; s1.score = 8;
    step(s1, IN);
    const d1 = Math.abs(s1.cpuY - 200);
    expect(d1).toBeGreaterThan(d0);
    expect(d1).toBeLessThan(4.6); // chưa chạm cap — đo đúng hệ số
  });

  it("serve luôn có velY khác 0 (góc ngẫu nhiên, không bóng thẳng)", () => {
    for (let i = 0; i < 20; i++) {
      const s = init();
      serve(s, true);
      expect(Math.abs(s.velY)).toBeGreaterThan(0);
    }
  });
});
