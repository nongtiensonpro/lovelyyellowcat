// gamesSnake.test.ts — logic Neon Snake pure (GM3). RNG inject để deterministic.
import { describe, it, expect } from "vitest";
import { init, step, queueDir, spawnFood, reset, COLS, ROWS, type SnakeState, type Cell } from "../../src/lib/games/snakeCore";

// rng sequence cố định: 0.51, 0.02, 0.33, 0.77, 0.44, ...
function seqRng(vals: number[]): () => number {
  let i = 0;
  return () => vals[i++ % vals.length];
}

function bodyHas(s: SnakeState, c: Cell): boolean {
  return s.body.some((b) => b.x === c.x && b.y === c.y);
}

describe("SNAKE.EXE core", () => {
  it("init: 3 đốt giữa sân, hướng phải, không over", () => {
    const s = init(seqRng([0.51, 0.51]));
    expect(s.body.length).toBe(3);
    expect(s.dir).toBe("right");
    expect(s.over).toBe(false);
    expect(s.score).toBe(0);
  });

  it("step theo hướng: đầu tiến 1 ô", () => {
    const s = init(seqRng([0.51, 0.51]));
    step(s);
    expect(s.body[0]).toEqual({ x: 11, y: 7 });
    expect(s.body.length).toBe(3);
  });

  it("queueDir chặn quay đầu 180°", () => {
    const s = init(seqRng([0.51, 0.51]));
    queueDir(s, "left"); // đang right → left là 180°
    expect(s.pending.length).toBe(0);
    queueDir(s, "up");
    queueDir(s, "down"); // ngược up vừa xếp → bỏ
    expect(s.pending).toEqual(["up"]);
  });

  it("đầu chạm tường phải → over", () => {
    const s = init(seqRng([0.51, 0.51]));
    s.body[0] = { x: COLS - 1, y: 7 };
    s.dir = "right";
    step(s);
    expect(s.over).toBe(true);
  });

  it("đầu chạm thân → over", () => {
    const s = init(seqRng([0.51, 0.51]));
    // dựng thân: đầu (5,7), thân (6,7) phía trước → đi phải = cắn
    s.body = [
      { x: 5, y: 7 },
      { x: 6, y: 7 },
      { x: 6, y: 8 },
    ];
    s.dir = "right";
    step(s);
    expect(s.over).toBe(true);
  });

  it("ăn mồi: score +1, mồi mới, dài +1 đốt", () => {
    const s = init(seqRng([0.51, 0.51, 0.13, 0.61]));
    s.food = { x: 11, y: 7 }; // trước đầu
    const len0 = s.body.length;
    step(s);
    expect(s.score).toBe(1);
    expect(s.body.length).toBe(len0 + 1);
    expect(s.food).not.toEqual({ x: 11, y: 7 });
  });

  it("không ăn: đuôi rút — chiều dài không đổi", () => {
    const s = init(seqRng([0.51, 0.51]));
    const len0 = s.body.length;
    step(s);
    expect(s.body.length).toBe(len0);
  });

  it("mồi luôn spawn ngoài thân", () => {
    const s = init(seqRng([0.51, 0.51]));
    const f = spawnFood(s);
    expect(bodyHas(s, f)).toBe(false);
    expect(f.x).toBeGreaterThanOrEqual(0);
    expect(f.x).toBeLessThan(COLS);
    expect(f.y).toBeGreaterThanOrEqual(0);
    expect(f.y).toBeLessThan(ROWS);
  });

  it("pending hướng được tiêu thụ từng step", () => {
    const s = init(seqRng([0.51, 0.51]));
    queueDir(s, "up");
    step(s); // tiêu "up"
    expect(s.dir).toBe("up");
    step(s); // pending rỗng — vẫn up
    expect(s.body[0]).toEqual({ x: 10, y: 5 });
  });

  it("over rồi: step không đổi gì (idempotent)", () => {
    const s = init(seqRng([0.51, 0.51]));
    s.over = true;
    const snap = JSON.stringify(s.body);
    step(s);
    expect(JSON.stringify(s.body)).toBe(snap);
  });

  it("reset = init với cùng rng", () => {
    const s = init(seqRng([0.51, 0.51]));
    s.score = 9;
    const s2 = reset(s);
    expect(s2.score).toBe(0);
    expect(s2.body.length).toBe(3);
  });
});
