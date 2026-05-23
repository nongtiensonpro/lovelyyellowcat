import type { createSupabaseServerClient } from "./supabase";
import {
  deleteCloudinaryImages,
  formatCloudinaryDeleteSummary,
  getCloudinaryPublicIdFromUrl,
  getCloudinaryPublicIdsFromText,
} from "./cloudinary";

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

export type AdminActionResult = {
  success: boolean;
  message: string;
};

type IdRow = {
  id: string;
};

type CommentTreeRow = {
  id: string;
  parent_id: string | null;
};

const rlsHint = "Nếu bản ghi vẫn còn trong database, hãy chạy migration supabase_admin_moderation_fixes.sql để cập nhật RLS.";

const uniqueIds = (ids: Array<string | null | undefined>) =>
  [...new Set(ids.filter((id): id is string => Boolean(id)))];

const fail = (message: string): AdminActionResult => ({
  success: false,
  message,
});

const ok = (message: string): AdminActionResult => ({
  success: true,
  message,
});

async function deleteRowsByArticleIds(
  supabase: SupabaseServerClient,
  table: "comments" | "reactions",
  articleIds: string[],
  label: string
): Promise<AdminActionResult> {
  const ids = uniqueIds(articleIds);
  if (ids.length === 0) return ok(`Không có ${label} liên quan cần xóa.`);

  const { data: existingRows, error: selectError } = await supabase
    .from(table)
    .select("id")
    .in("article_id", ids);

  if (selectError) {
    return fail(`Không thể kiểm tra ${label} liên quan: ${selectError.message}`);
  }

  const expectedCount = existingRows?.length || 0;
  if (expectedCount === 0) return ok(`Không có ${label} liên quan cần xóa.`);

  const { data: deletedRows, error: deleteError } = await supabase
    .from(table)
    .delete()
    .in("article_id", ids)
    .select("id");

  if (deleteError) {
    return fail(`Lỗi khi xóa ${label} liên quan: ${deleteError.message}`);
  }

  const deletedCount = deletedRows?.length || 0;
  if (deletedCount !== expectedCount) {
    return fail(`Chỉ xóa được ${deletedCount}/${expectedCount} ${label} liên quan. ${rlsHint}`);
  }

  return ok(`Đã xóa ${deletedCount} ${label} liên quan.`);
}

export async function deleteCommentThread(
  supabase: SupabaseServerClient,
  commentId: string
): Promise<AdminActionResult> {
  const { data: rootComment, error: rootError } = await supabase
    .from("comments")
    .select("id")
    .eq("id", commentId)
    .maybeSingle<IdRow>();

  if (rootError) {
    return fail(`Không thể kiểm tra bình luận: ${rootError.message}`);
  }

  if (!rootComment) {
    return fail("Không tìm thấy bình luận cần xóa hoặc bạn không có quyền truy cập.");
  }

  const layers: string[][] = [[commentId]];

  for (let depth = 0; depth < 20; depth += 1) {
    const parentIds = layers[depth];
    if (!parentIds || parentIds.length === 0) break;

    const { data: children, error: childError } = await supabase
      .from("comments")
      .select("id, parent_id")
      .in("parent_id", parentIds);

    if (childError) {
      return fail(`Không thể tải phản hồi con của bình luận: ${childError.message}`);
    }

    const childIds = uniqueIds((children as CommentTreeRow[] | null)?.map((child) => child.id) || []);
    if (childIds.length === 0) break;

    layers.push(childIds);
  }

  let deletedTotal = 0;

  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const ids = layers[index];
    if (!ids || ids.length === 0) continue;

    const { data: deletedRows, error: deleteError } = await supabase
      .from("comments")
      .delete()
      .in("id", ids)
      .select("id");

    if (deleteError) {
      return fail(`Lỗi khi xóa bình luận: ${deleteError.message}`);
    }

    const deletedCount = deletedRows?.length || 0;
    if (deletedCount !== ids.length) {
      return fail(`Chỉ xóa được ${deletedCount}/${ids.length} bình luận ở một cấp phản hồi. ${rlsHint}`);
    }

    deletedTotal += deletedCount;
  }

  return ok(`Đã xóa vĩnh viễn ${deletedTotal} bình luận/phản hồi liên quan.`);
}

export async function deleteArticleWithRelations(
  supabase: SupabaseServerClient,
  articleId: string
): Promise<AdminActionResult> {
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id, slug, title, cover_url, body_md")
    .eq("id", articleId)
    .maybeSingle<{ id: string; slug: string; title: string; cover_url: string | null; body_md: string | null }>();

  if (articleError) {
    return fail(`Không thể kiểm tra bài viết: ${articleError.message}`);
  }

  if (!article) {
    return fail("Không tìm thấy bài viết cần xóa hoặc bạn không có quyền truy cập.");
  }

  const relatedKeys = uniqueIds([article.slug, article.id]);

  const commentsResult = await deleteRowsByArticleIds(supabase, "comments", relatedKeys, "bình luận");
  if (!commentsResult.success) return commentsResult;

  const reactionsResult = await deleteRowsByArticleIds(supabase, "reactions", relatedKeys, "cảm xúc");
  if (!reactionsResult.success) return reactionsResult;

  const { data: deletedRows, error: deleteError } = await supabase
    .from("articles")
    .delete()
    .eq("id", article.id)
    .select("id");

  if (deleteError) {
    return fail(`Lỗi khi xóa bài viết: ${deleteError.message}`);
  }

  if ((deletedRows?.length || 0) !== 1) {
    return fail(`Bài viết chưa bị xóa khỏi database. ${rlsHint}`);
  }

  const cloudinaryPublicIds = uniqueIds([
    getCloudinaryPublicIdFromUrl(article.cover_url),
    ...getCloudinaryPublicIdsFromText(article.body_md),
  ]);
  const cloudinaryResult = await deleteCloudinaryImages(cloudinaryPublicIds);
  const cloudinaryMessage = formatCloudinaryDeleteSummary(cloudinaryResult);

  if (cloudinaryResult.errors.length > 0) {
    return fail(`Đã xóa bài viết "${article.title}" khỏi database, nhưng chưa dọn sạch ảnh Cloudinary. ${cloudinaryMessage}`);
  }

  return ok(`Đã xóa vĩnh viễn bài viết "${article.title}" cùng bình luận, cảm xúc và ảnh liên quan. ${cloudinaryMessage}`);
}

export async function deleteSubmissionWithRelations(
  supabase: SupabaseServerClient,
  submissionId: string
): Promise<AdminActionResult> {
  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, title, image_pid, image_url")
    .eq("id", submissionId)
    .maybeSingle<{ id: string; title: string; image_pid: string | null; image_url: string | null }>();

  if (submissionError) {
    return fail(`Không thể kiểm tra tranh cộng đồng: ${submissionError.message}`);
  }

  if (!submission) {
    return fail("Không tìm thấy tranh cần xóa hoặc bạn không có quyền truy cập.");
  }

  const commentsResult = await deleteRowsByArticleIds(supabase, "comments", [submission.id], "bình luận");
  if (!commentsResult.success) return commentsResult;

  const reactionsResult = await deleteRowsByArticleIds(supabase, "reactions", [submission.id], "cảm xúc");
  if (!reactionsResult.success) return reactionsResult;

  const { data: deletedRows, error: deleteError } = await supabase
    .from("submissions")
    .delete()
    .eq("id", submission.id)
    .select("id");

  if (deleteError) {
    return fail(`Lỗi khi xóa tranh cộng đồng: ${deleteError.message}`);
  }

  if ((deletedRows?.length || 0) !== 1) {
    return fail(`Tranh cộng đồng chưa bị xóa khỏi database. ${rlsHint}`);
  }

  const cloudinaryPublicIds = uniqueIds([
    submission.image_pid,
    getCloudinaryPublicIdFromUrl(submission.image_url),
  ]);
  const cloudinaryResult = await deleteCloudinaryImages(cloudinaryPublicIds);
  const cloudinaryMessage = formatCloudinaryDeleteSummary(cloudinaryResult);

  if (cloudinaryResult.errors.length > 0) {
    return fail(`Đã xóa tranh "${submission.title}" khỏi database, nhưng chưa xóa được ảnh Cloudinary. ${cloudinaryMessage}`);
  }

  return ok(`Đã xóa vĩnh viễn tranh "${submission.title}" cùng bình luận, cảm xúc, yêu thích và ảnh Cloudinary liên quan. ${cloudinaryMessage}`);
}
