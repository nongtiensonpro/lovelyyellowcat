// snakeCore.ts — logic Neon Snake thuần trên lưới 20x15 (không DOM/canvas).
// Mỗi "step" = 1 cell (component tự quyết nhịp thời gian). Render ở component.

export type Dir = "up" | "down" | "left" | "right";
export type Cell = { x: number; y: number };

export interface SnakeState {
  body: Cell[]; // [0] = đầu
  dir: Dir;
  pending: Dir[]; // hàng đợi hướng (chặn quay đầu 180°)
  food: Cell;
  score: number;
  over: boolean;
  rng: () => number; // inject để test deterministic
}

export const COLS = 32; // 16:9 widescreen — cell 30px × 32×18 = 960×540 (khớp canvas)
export const ROWS = 18;

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function randCell(rng: () => number): Cell {
  return { x: Math.floor(rng() * COLS), y: Math.floor(rng() * ROWS) };
}

/** Spawn mồi không trúng thân rắn. */
export function spawnFood(s: SnakeState): Cell {
  for (let tries = 0; tries < 500; tries++) {
    const f = randCell(s.rng);
    if (!s.body.some((c) => c.x === f.x && c.y === f.y)) return f;
  }
  return { x: 0, y: 0 };
}

/** Trạng thái đầu: rắn 3 đốt giữa sân, hướng phải, mồi random. */
export function init(rng: () => number = Math.random): SnakeState {
  const body: Cell[] = [
    { x: 16, y: 9 },
    { x: 15, y: 9 },
    { x: 14, y: 9 },
  ];
  const s: SnakeState = {
    body,
    dir: "right",
    pending: [],
    food: { x: 0, y: 0 },
    score: 0,
    over: false,
    rng,
  };
  s.food = spawnFood(s);
  return s;
}

/** Đưa hướng vào hàng đợi (bỏ nếu rỗng/lặp/quay đầu 180°). */
export function queueDir(s: SnakeState, dir: Dir): void {
  const last = s.pending.length > 0 ? s.pending[s.pending.length - 1] : s.dir;
  if (dir === last || dir === OPPOSITE[last]) return;
  s.pending.push(dir);
}

/** Một bước: chuyển hướng → đầu tiên tiến → ăn/tường/thân → over. */
export function step(s: SnakeState): SnakeState {
  if (s.over) return s;
  const next = s.pending.shift();
  if (next) s.dir = next;
  const d = DELTA[s.dir];
  const head: Cell = { x: s.body[0].x + d.x, y: s.body[0].y + d.y };
  // tường = over (không xuyên)
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    s.over = true;
    return s;
  }
  // cắn thân = over (đuôi sẽ rời đi nên bỏ đốt cuối khi kiểm)
  const hitBody = s.body.slice(0, -1).some((c) => c.x === head.x && c.y === head.y);
  if (hitBody) {
    s.over = true;
    return s;
  }
  s.body.unshift(head);
  const ate = head.x === s.food.x && head.y === s.food.y;
  if (ate) {
    s.score += 1;
    s.food = spawnFood(s);
  } else {
    s.body.pop();
  }
  return s;
}

/** Reset (nút chơi lại). */
export function reset(s: SnakeState): SnakeState {
  return init(s.rng);
}
