import { describe, it, expect } from "vitest";
import {
  rootComments, repliesFor, nextReplyDepth, depthClassFor, MAX_COMMENT_DEPTH,
  type CommentNode,
} from "../../src/components/article/commentTree";

const c = (over: Partial<CommentNode>): CommentNode => ({ id: Math.random().toString(36).slice(2), ...over });

describe("rootComments", () => {
  it("chỉ lấy comment không có parent", () => {
    const list = [c({ id: "r1" }), c({ id: "child", parent_id: "r1", depth: 1 }), c({ id: "r2", parent_id: null })];
    expect(rootComments(list).map((x) => x.id)).toEqual(["r1", "r2"]);
  });
});

describe("repliesFor", () => {
  it("lọc theo parent_id", () => {
    const list = [c({ id: "a" }), c({ id: "b", parent_id: "a" }), c({ id: "c", parent_id: "a" }), c({ id: "d", parent_id: "b" })];
    expect(repliesFor(list, "a").map((x) => x.id)).toEqual(["b", "c"]);
  });
});

describe("nextReplyDepth", () => {
  it("gốc (depth 0) → 1", () => {
    expect(nextReplyDepth(c({ id: "x", depth: 0 }))).toBe(1);
  });
  it("depth 2 → 3 (cho phép)", () => {
    expect(nextReplyDepth(c({ id: "x", depth: 2 }))).toBe(3);
  });
  it("depth 3 → null (chặn vượt MAX)", () => {
    expect(nextReplyDepth(c({ id: "x", depth: 3 }))).toBeNull();
  });
  it("MAX_COMMENT_DEPTH = 3", () => {
    expect(MAX_COMMENT_DEPTH).toBe(3);
  });
});

describe("depthClassFor", () => {
  it("0/undefined → rỗng", () => {
    expect(depthClassFor(0)).toBe("");
    expect(depthClassFor(undefined)).toBe("");
  });
  it("1/2/3 → class thụt tăng dần", () => {
    expect(depthClassFor(1)).toContain("ml-4");
    expect(depthClassFor(2)).toContain("ml-8");
    expect(depthClassFor(3)).toContain("ml-12");
  });
});
