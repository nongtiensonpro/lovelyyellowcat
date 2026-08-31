// commentTree.ts — pure helpers cho cây bình luận (Phase 5).
// Tách từ RealtimeComments.tsx — MAX_DEPTH là rule nghiệp vụ.

export interface CommentNode {
  id: string;
  parent_id?: string | null;
  depth?: number;
  profiles?: { id?: string; full_name?: string; avatar_url?: string } | null;
}

/** Rule nghiệp vụ: chỉ lồng tối đa 3 cấp (0 = gốc). */
export const MAX_COMMENT_DEPTH = 3;

export function rootComments<T extends CommentNode>(comments: T[]): T[] {
  return comments.filter((c) => !c.parent_id);
}

export function repliesFor<T extends CommentNode>(comments: T[], parentId: string): T[] {
  return comments.filter((c) => c.parent_id === parentId);
}

/** Depth tiếp theo nếu reply vào parent; null = vượt giới hạn (không cho reply). */
export function nextReplyDepth(parent: CommentNode): number | null {
  const next = (parent.depth ?? 0) + 1;
  return next > MAX_COMMENT_DEPTH ? null : next;
}

/** Class thụt đầu dòng theo depth (same classes như bản cũ). */
export function depthClassFor(depth: number | undefined): string {
  if (depth === 1) return "ml-4 sm:ml-6 border-l border-dashed border-win-dark/50 pl-2 sm:pl-3";
  if (depth === 2) return "ml-8 sm:ml-12 border-l border-dashed border-win-dark/50 pl-2 sm:pl-3";
  if (depth === 3) return "ml-12 sm:ml-16 border-l border-dashed border-win-dark/50 pl-2 sm:pl-3";
  return "";
}
