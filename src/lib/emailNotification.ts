/**
 * Email Notification Helper — Gửi thông báo email cho hành động ban/unban
 * 
 * Sử dụng Resend API (https://resend.com) — dịch vụ email được Supabase khuyên dùng.
 * Cấu hình: thêm RESEND_API_KEY vào .dev.vars (local) và Cloudflare Secrets (production).
 * 
 * Nếu bạn đã cấu hình SMTP trên Supabase và muốn dùng dịch vụ email khác,
 * chỉ cần thay đổi hàm sendEmail() bên dưới để gọi API phù hợp.
 */

// ── Kiểu dữ liệu ──

export interface BanEmailPayload {
  recipientEmail: string;
  recipientName: string;
  reason: string;
  contactEmail: string;
}

export interface UnbanEmailPayload {
  recipientEmail: string;
  recipientName: string;
  contactEmail: string;
}

export interface EmailResult {
  success: boolean;
  message: string;
}

// ── Hằng số ──

const SITE_NAME = "Vaporwave Magazine";
const CONTACT_EMAIL = "nongtiensonpro@gmail.com";

// ── Hàm gửi email chính ──

/**
 * Gửi email qua Resend API.
 * Nếu RESEND_API_KEY không được cấu hình, trả về warning thay vì lỗi.
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  runtimeEnv?: any;
}): Promise<EmailResult> {
  // Lấy API key từ runtime env (Cloudflare Workers) hoặc import.meta.env
  const apiKey = params.runtimeEnv?.RESEND_API_KEY
    || import.meta.env.RESEND_API_KEY
    || (typeof process !== "undefined" ? process.env?.RESEND_API_KEY : undefined);

  // Lấy from email (tùy chỉnh hoặc mặc định)
  const fromEmail = params.runtimeEnv?.RESEND_FROM_EMAIL
    || import.meta.env.RESEND_FROM_EMAIL
    || "Vaporwave Magazine <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[EMAIL] ⚠️ RESEND_API_KEY chưa được cấu hình. Bỏ qua gửi email.");
    return {
      success: false,
      message: "Email chưa được gửi (RESEND_API_KEY chưa cấu hình). Hành động vẫn thực hiện thành công.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[EMAIL] ❌ Resend API error:", response.status, result);
      return {
        success: false,
        message: `Lỗi gửi email: ${(result as any)?.message || `HTTP ${response.status}`}`,
      };
    }

    console.log("[EMAIL] ✅ Email đã gửi thành công đến:", params.to, "| ID:", (result as any)?.id);
    return {
      success: true,
      message: `Email thông báo đã được gửi đến ${params.to}.`,
    };
  } catch (error: any) {
    console.error("[EMAIL] ❌ Lỗi kết nối:", error.message);
    return {
      success: false,
      message: `Không thể gửi email: ${error.message}`,
    };
  }
}

// ── Template Email Cấm Tài Khoản ──

function buildBanEmailHtml(payload: BanEmailPayload): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border:2px solid #ff71ce;border-radius:0;">
    
    <!-- Header -->
    <div style="background:linear-gradient(90deg,#ff71ce,#b967ff,#01cdfe);padding:4px 16px;display:flex;align-items:center;">
      <span style="color:#fff;font-weight:bold;font-size:12px;font-family:'Courier New',monospace;">⚠️ SYSTEM_NOTIFICATION.EXE</span>
    </div>
    
    <!-- Banner -->
    <div style="text-align:center;padding:32px 24px 16px;border-bottom:1px solid rgba(255,113,206,0.3);">
      <div style="font-size:48px;margin-bottom:8px;">🚫</div>
      <h1 style="color:#ff71ce;font-size:22px;font-weight:bold;margin:0;text-transform:uppercase;letter-spacing:3px;font-family:'Courier New',monospace;">
        Tài Khoản Bị Tạm Ngưng
      </h1>
    </div>
    
    <!-- Body -->
    <div style="padding:24px 28px;">
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Xin chào <strong style="color:#01cdfe;">${escapeHtml(payload.recipientName)}</strong>,
      </p>
      
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Chúng tôi thông báo rằng tài khoản của bạn trên <strong style="color:#fffb96;">${SITE_NAME}</strong> 
        đã bị <span style="color:#ff4757;font-weight:bold;">tạm ngưng hoạt động</span> do vi phạm nội quy và quy định sử dụng của hệ thống.
      </p>
      
      <!-- Reason Box -->
      <div style="background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.4);border-left:4px solid #ff4757;padding:16px;margin:20px 0;">
        <p style="color:#ff6b81;font-size:12px;text-transform:uppercase;font-weight:bold;margin:0 0 6px;font-family:'Courier New',monospace;">
          📋 Lý do:
        </p>
        <p style="color:#e0e0e0;font-size:14px;line-height:1.5;margin:0;">
          ${escapeHtml(payload.reason)}
        </p>
      </div>
      
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:16px 0;">
        Kể từ thời điểm này, bạn sẽ <strong>không thể đăng nhập</strong> hay sử dụng bất kỳ tính năng nào trên website, 
        bao gồm: đăng bài viết, bình luận, gửi tranh, và các hoạt động khác.
      </p>
      
      <!-- Contact Box -->
      <div style="background:rgba(1,205,254,0.1);border:1px solid rgba(1,205,254,0.3);border-left:4px solid #01cdfe;padding:16px;margin:20px 0;">
        <p style="color:#01cdfe;font-size:12px;text-transform:uppercase;font-weight:bold;margin:0 0 6px;font-family:'Courier New',monospace;">
          📧 Khiếu nại & Liên hệ:
        </p>
        <p style="color:#e0e0e0;font-size:14px;line-height:1.5;margin:0;">
          Nếu bạn cho rằng đây là một nhầm lẫn hoặc muốn trao đổi thêm thông tin, vui lòng liên hệ qua email:
        </p>
        <p style="margin:8px 0 0;">
          <a href="mailto:${escapeHtml(payload.contactEmail)}" style="color:#fffb96;font-size:16px;font-weight:bold;text-decoration:underline;">
            ${escapeHtml(payload.contactEmail)}
          </a>
        </p>
      </div>
      
      <p style="color:#999;font-size:13px;line-height:1.5;margin:20px 0 0;">
        Chúng tôi luôn sẵn sàng lắng nghe và xem xét lại quyết định nếu có cơ sở hợp lý. 
        Xin cảm ơn sự thấu hiểu của bạn.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="border-top:1px solid rgba(255,113,206,0.2);padding:16px 28px;text-align:center;">
      <p style="color:#666;font-size:11px;margin:0;font-family:'Courier New',monospace;">
        ${SITE_NAME} — AESTHETIC_SYSTEM v2.0
      </p>
      <p style="color:#555;font-size:10px;margin:4px 0 0;">
        Email này được gửi tự động. Vui lòng không phản hồi trực tiếp.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Template Email Gỡ Cấm Tài Khoản ──

function buildUnbanEmailHtml(payload: UnbanEmailPayload): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border:2px solid #05ffa1;border-radius:0;">
    
    <!-- Header -->
    <div style="background:linear-gradient(90deg,#05ffa1,#01cdfe,#b967ff);padding:4px 16px;display:flex;align-items:center;">
      <span style="color:#fff;font-weight:bold;font-size:12px;font-family:'Courier New',monospace;">✅ SYSTEM_NOTIFICATION.EXE</span>
    </div>
    
    <!-- Banner -->
    <div style="text-align:center;padding:32px 24px 16px;border-bottom:1px solid rgba(5,255,161,0.3);">
      <div style="font-size:48px;margin-bottom:8px;">🎉</div>
      <h1 style="color:#05ffa1;font-size:22px;font-weight:bold;margin:0;text-transform:uppercase;letter-spacing:3px;font-family:'Courier New',monospace;">
        Tài Khoản Đã Được Khôi Phục
      </h1>
    </div>
    
    <!-- Body -->
    <div style="padding:24px 28px;">
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Xin chào <strong style="color:#01cdfe;">${escapeHtml(payload.recipientName)}</strong>,
      </p>
      
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Chúng tôi vui mừng thông báo rằng tài khoản của bạn trên <strong style="color:#fffb96;">${SITE_NAME}</strong> 
        đã được <span style="color:#05ffa1;font-weight:bold;">khôi phục hoạt động</span>.
      </p>
      
      <!-- Welcome Back Box -->
      <div style="background:rgba(5,255,161,0.1);border:1px solid rgba(5,255,161,0.3);border-left:4px solid #05ffa1;padding:16px;margin:20px 0;">
        <p style="color:#05ffa1;font-size:12px;text-transform:uppercase;font-weight:bold;margin:0 0 6px;font-family:'Courier New',monospace;">
          🟢 Trạng thái tài khoản:
        </p>
        <p style="color:#e0e0e0;font-size:14px;line-height:1.5;margin:0;">
          Tài khoản của bạn hiện đã <strong style="color:#05ffa1;">HOẠT ĐỘNG</strong>. 
          Bạn có thể đăng nhập lại bằng tài khoản Google và sử dụng tất cả các tính năng trên website.
        </p>
      </div>
      
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:16px 0;">
        Bạn có thể tiếp tục tham gia cộng đồng: xem triển lãm, bình luận, gửi tranh nghệ thuật, và khám phá nội dung mới.
        Hãy đảm bảo tuân thủ nội quy cộng đồng để có trải nghiệm tốt nhất nhé!
      </p>
      
      <!-- Contact Box -->
      <div style="background:rgba(1,205,254,0.1);border:1px solid rgba(1,205,254,0.3);border-left:4px solid #01cdfe;padding:16px;margin:20px 0;">
        <p style="color:#01cdfe;font-size:12px;text-transform:uppercase;font-weight:bold;margin:0 0 6px;font-family:'Courier New',monospace;">
          📧 Hỗ trợ:
        </p>
        <p style="color:#e0e0e0;font-size:14px;line-height:1.5;margin:0;">
          Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ:
          <a href="mailto:${escapeHtml(payload.contactEmail)}" style="color:#fffb96;font-weight:bold;text-decoration:underline;">
            ${escapeHtml(payload.contactEmail)}
          </a>
        </p>
      </div>
      
      <p style="color:#b967ff;font-size:14px;font-weight:bold;text-align:center;margin:24px 0 0;">
        ✨ Chào mừng bạn trở lại với ${SITE_NAME}! ✨
      </p>
    </div>
    
    <!-- Footer -->
    <div style="border-top:1px solid rgba(5,255,161,0.2);padding:16px 28px;text-align:center;">
      <p style="color:#666;font-size:11px;margin:0;font-family:'Courier New',monospace;">
        ${SITE_NAME} — AESTHETIC_SYSTEM v2.0
      </p>
      <p style="color:#555;font-size:10px;margin:4px 0 0;">
        Email này được gửi tự động. Vui lòng không phản hồi trực tiếp.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Helper escape HTML ──

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Hàm public: Gửi email thông báo cấm tài khoản ──

export async function sendBanNotificationEmail(
  payload: BanEmailPayload,
  runtimeEnv?: any
): Promise<EmailResult> {
  return sendEmail({
    to: payload.recipientEmail,
    subject: `⚠️ [${SITE_NAME}] Thông báo: Tài khoản của bạn đã bị tạm ngưng`,
    html: buildBanEmailHtml(payload),
    runtimeEnv,
  });
}

// ── Hàm public: Gửi email thông báo gỡ cấm tài khoản ──

export async function sendUnbanNotificationEmail(
  payload: UnbanEmailPayload,
  runtimeEnv?: any
): Promise<EmailResult> {
  return sendEmail({
    to: payload.recipientEmail,
    subject: `✅ [${SITE_NAME}] Tài khoản của bạn đã được khôi phục`,
    html: buildUnbanEmailHtml(payload),
    runtimeEnv,
  });
}
