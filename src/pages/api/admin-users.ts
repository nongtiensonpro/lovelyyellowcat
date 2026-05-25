import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase";
import { sendBanNotificationEmail, sendUnbanNotificationEmail } from "../../lib/emailNotification";
import { env } from "cloudflare:workers";

const USERS_PER_PAGE = 10;

/**
 * Helper: Xác thực admin — trả về supabase client + admin profile
 * hoặc trả về Response lỗi nếu không đủ quyền.
 */
async function authenticateAdmin(context: any) {
  const supabase = createSupabaseServerClient({
    request: context.request,
    cookies: context.cookies,
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Response(JSON.stringify({ error: "Chưa đăng nhập." }), { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: new Response(JSON.stringify({ error: "Bạn không có quyền truy cập. Chỉ admin mới được quản lý người dùng." }), { status: 403 }) };
  }

  return { supabase, admin: profile };
}

/**
 * GET /api/admin-users?page=1&search=abc&role=reader&status=active
 * Lấy danh sách người dùng với phân trang, tìm kiếm và lọc
 */
export const GET: APIRoute = async (context) => {
  const auth = await authenticateAdmin(context);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const search = url.searchParams.get("search")?.trim() || "";
  const roleFilter = url.searchParams.get("role") || "";
  const statusFilter = url.searchParams.get("status") || "";

  // Xây dựng query
  let query = supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, created_at, is_banned, banned_at, ban_reason", { count: "exact" });

  // Tìm kiếm theo tên hoặc email
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Lọc theo role
  if (roleFilter && ["reader", "editor", "admin"].includes(roleFilter)) {
    query = query.eq("role", roleFilter);
  }

  // Lọc theo trạng thái (active / banned)
  if (statusFilter === "active") {
    query = query.or("is_banned.is.null,is_banned.eq.false");
  } else if (statusFilter === "banned") {
    query = query.eq("is_banned", true);
  }

  // Phân trang
  const from = (page - 1) * USERS_PER_PAGE;
  const to = from + USERS_PER_PAGE - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data: users, count, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({
    users: users || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / USERS_PER_PAGE),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * PUT /api/admin-users — Đổi vai trò người dùng
 * Body: { userId: string, newRole: "reader" | "editor" | "admin" }
 */
export const PUT: APIRoute = async (context) => {
  const auth = await authenticateAdmin(context);
  if ("error" in auth) return auth.error;
  const { supabase, admin } = auth;

  let body: any;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body không hợp lệ." }), { status: 400 });
  }

  const { userId, newRole } = body;

  if (!userId || !newRole) {
    return new Response(JSON.stringify({ error: "Thiếu userId hoặc newRole." }), { status: 400 });
  }

  if (!["reader", "editor", "admin"].includes(newRole)) {
    return new Response(JSON.stringify({ error: "Role không hợp lệ. Chỉ chấp nhận: reader, editor, admin." }), { status: 400 });
  }

  // Không cho phép admin tự thay đổi role chính mình
  if (userId === admin.id) {
    return new Response(JSON.stringify({ error: "Bạn không thể tự thay đổi vai trò của chính mình." }), { status: 400 });
  }

  // Lấy role hiện tại của target user
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return new Response(JSON.stringify({ error: "Không tìm thấy người dùng." }), { status: 404 });
  }

  // Kiểm tra nếu hạ role admin cuối cùng
  if (targetProfile.role === "admin" && newRole !== "admin") {
    const { data: adminCount } = await supabase.rpc("count_admins");
    if (adminCount !== null && adminCount <= 1) {
      return new Response(JSON.stringify({
        error: "Không thể hạ vai trò admin cuối cùng. Hệ thống phải có ít nhất 1 admin."
      }), { status: 400 });
    }
  }

  // Cập nhật role
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (updateError) {
    return new Response(JSON.stringify({ error: `Lỗi cập nhật: ${updateError.message}` }), { status: 500 });
  }

  // Ghi audit log
  await supabase.from("admin_audit_log").insert({
    admin_id: admin.id,
    action: "role_change",
    target_id: userId,
    details: {
      old_role: targetProfile.role,
      new_role: newRole,
      target_name: targetProfile.full_name,
    },
  });

  return new Response(JSON.stringify({
    success: true,
    message: `Đã thay đổi vai trò của ${targetProfile.full_name} từ ${targetProfile.role} sang ${newRole}.`
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

/**
 * POST /api/admin-users — Ban / Unban người dùng
 * Body: { userId: string, action: "ban" | "unban", reason?: string }
 */
export const POST: APIRoute = async (context) => {
  const auth = await authenticateAdmin(context);
  if ("error" in auth) return auth.error;
  const { supabase, admin } = auth;

  let body: any;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body không hợp lệ." }), { status: 400 });
  }

  const { userId, action, reason } = body;

  if (!userId || !action) {
    return new Response(JSON.stringify({ error: "Thiếu userId hoặc action." }), { status: 400 });
  }

  if (!["ban", "unban"].includes(action)) {
    return new Response(JSON.stringify({ error: "Action không hợp lệ. Chỉ chấp nhận: ban, unban." }), { status: 400 });
  }

  // Không cho phép admin tự ban chính mình
  if (userId === admin.id) {
    return new Response(JSON.stringify({ error: "Bạn không thể tự cấm tài khoản chính mình." }), { status: 400 });
  }

  // Lấy thông tin target user
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_banned")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return new Response(JSON.stringify({ error: "Không tìm thấy người dùng." }), { status: 404 });
  }

  // Không cho phép ban admin khác (phải hạ role trước)
  if (action === "ban" && targetProfile.role === "admin") {
    return new Response(JSON.stringify({
      error: "Không thể cấm tài khoản admin. Hãy hạ vai trò xuống reader/editor trước."
    }), { status: 400 });
  }

  if (action === "ban") {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_by: admin.id,
        ban_reason: reason || "Vi phạm quy tắc cộng đồng.",
      })
      .eq("id", userId);

    if (updateError) {
      return new Response(JSON.stringify({ error: `Lỗi cập nhật: ${updateError.message}` }), { status: 500 });
    }

    // Ghi audit log
    await supabase.from("admin_audit_log").insert({
      admin_id: admin.id,
      action: "ban",
      target_id: userId,
      details: {
        target_name: targetProfile.full_name,
        reason: reason || "Vi phạm quy tắc cộng đồng.",
      },
    });

    // Gửi email thông báo cấm tài khoản
    const emailResult = await sendBanNotificationEmail(
      {
        recipientEmail: targetProfile.email,
        recipientName: targetProfile.full_name || targetProfile.email,
        reason: reason || "Vi phạm quy tắc cộng đồng.",
        contactEmail: "nongtiensonpro@gmail.com",
      },
      env
    );

    const emailNote = emailResult.success
      ? " Email thông báo đã được gửi."
      : ` (${emailResult.message})`;

    return new Response(JSON.stringify({
      success: true,
      message: `Đã cấm tài khoản ${targetProfile.full_name}. Người dùng sẽ không thể đăng nhập vào website.${emailNote}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } else {
    // Unban
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_banned: false,
        banned_at: null,
        banned_by: null,
        ban_reason: null,
      })
      .eq("id", userId);

    if (updateError) {
      return new Response(JSON.stringify({ error: `Lỗi cập nhật: ${updateError.message}` }), { status: 500 });
    }

    // Ghi audit log
    await supabase.from("admin_audit_log").insert({
      admin_id: admin.id,
      action: "unban",
      target_id: userId,
      details: {
        target_name: targetProfile.full_name,
      },
    });

    // Gửi email thông báo gỡ cấm tài khoản
    const emailResult = await sendUnbanNotificationEmail(
      {
        recipientEmail: targetProfile.email,
        recipientName: targetProfile.full_name || targetProfile.email,
        contactEmail: "nongtiensonpro@gmail.com",
      },
      env
    );

    const emailNote = emailResult.success
      ? " Email thông báo đã được gửi."
      : ` (${emailResult.message})`;

    return new Response(JSON.stringify({
      success: true,
      message: `Đã gỡ cấm tài khoản ${targetProfile.full_name}. Người dùng có thể đăng nhập lại.${emailNote}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
