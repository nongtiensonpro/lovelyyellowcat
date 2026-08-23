import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditTargetType =
  | "profile"
  | "article"
  | "submission"
  | "comment";

export interface AdminAuditInput {
  adminId: string;
  action: string;
  targetType?: AuditTargetType;
  targetId?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Ghi một bản ghi vào admin_audit_log.
 * - Không bao giờ ném lỗi ra ngoài (audit failure không được phá luồng nghiệp vụ).
 * - Tương thích schema cũ (chưa có target_type): insert sẽ bị bỏ qua lặng lẽ.
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  input: AdminAuditInput
): Promise<void> {
  try {
    await supabase.from("admin_audit_log").insert({
      admin_id: input.adminId,
      action: input.action,
      target_type: input.targetType ?? "profile",
      target_id: input.targetId ?? null,
      details: input.details ?? {},
    });
  } catch {
    // Bỏ qua: schema cũ chưa có cột target_type hoặc RLS chặn — không phá luồng chính
  }
}
