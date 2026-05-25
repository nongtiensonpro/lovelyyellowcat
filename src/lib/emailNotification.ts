/**
 * Email Notification Helper — Gửi thông báo email qua Gmail API (REST)
 * 
 * Sử dụng Gmail API thay vì SMTP trực tiếp vì Cloudflare Workers
 * không hỗ trợ kết nối SMTP. Gmail API dùng fetch() hoạt động hoàn hảo.
 * 
 * Cấu hình cần thiết (xem hướng dẫn chi tiết ở cuối file):
 *   - GMAIL_CLIENT_ID
 *   - GMAIL_CLIENT_SECRET
 *   - GMAIL_REFRESH_TOKEN
 *   - GMAIL_SENDER_EMAIL (mặc định: nongtiensonpro@gmail.com)
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
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

// ── Helper: Encode UTF-8 string thành Base64URL (tương thích Gmail API) ──

function utf8ToBase64Url(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── Helper: Encode chuỗi UTF-8 cho MIME header (RFC 2047) ──

function encodeRfc2047(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

// ── Helper: Lấy Access Token từ Refresh Token ──

async function getGmailAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data: any = await response.json();

    if (!response.ok || !data.access_token) {
      console.error("[EMAIL] ❌ Lỗi lấy access token:", data.error || data.error_description || response.status);
      return null;
    }

    return data.access_token;
  } catch (error: any) {
    console.error("[EMAIL] ❌ Lỗi kết nối Google OAuth:", error.message);
    return null;
  }
}

// ── Hàm gửi email chính qua Gmail API ──

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  runtimeEnv?: any;
}): Promise<EmailResult> {
  // Lấy credentials từ runtime env (Cloudflare Workers) hoặc import.meta.env
  const clientId = params.runtimeEnv?.GMAIL_CLIENT_ID
    || import.meta.env.GMAIL_CLIENT_ID;

  const clientSecret = params.runtimeEnv?.GMAIL_CLIENT_SECRET
    || import.meta.env.GMAIL_CLIENT_SECRET;

  const refreshToken = params.runtimeEnv?.GMAIL_REFRESH_TOKEN
    || import.meta.env.GMAIL_REFRESH_TOKEN;

  const senderEmail = params.runtimeEnv?.GMAIL_SENDER_EMAIL
    || import.meta.env.GMAIL_SENDER_EMAIL
    || CONTACT_EMAIL;

  // Kiểm tra cấu hình
  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("[EMAIL] ⚠️ Gmail API chưa được cấu hình (thiếu GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN). Bỏ qua gửi email.");
    return {
      success: false,
      message: "Email chưa được gửi (Gmail API chưa cấu hình). Hành động vẫn thực hiện thành công.",
    };
  }

  // Bước 1: Lấy access token
  const accessToken = await getGmailAccessToken(clientId, clientSecret, refreshToken);
  if (!accessToken) {
    return {
      success: false,
      message: "Không thể lấy access token từ Google. Kiểm tra lại GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN.",
    };
  }

  // Bước 2: Xây dựng MIME message
  const mimeMessage = [
    `From: ${SITE_NAME} <${senderEmail}>`,
    `To: ${params.to}`,
    `Subject: ${encodeRfc2047(params.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(params.html))),
  ].join("\r\n");

  // Bước 3: Encode thành base64url cho Gmail API
  const rawMessage = utf8ToBase64Url(mimeMessage);

  // Bước 4: Gửi qua Gmail API
  try {
    const response = await fetch(GMAIL_SEND_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    const result: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[EMAIL] ❌ Gmail API error:", response.status, result);
      return {
        success: false,
        message: `Lỗi gửi email: ${result?.error?.message || `HTTP ${response.status}`}`,
      };
    }

    console.log("[EMAIL] ✅ Email đã gửi thành công đến:", params.to, "| Message ID:", result?.id);
    return {
      success: true,
      message: `Email thông báo đã được gửi đến ${params.to}.`,
    };
  } catch (error: any) {
    console.error("[EMAIL] ❌ Lỗi kết nối Gmail API:", error.message);
    return {
      success: false,
      message: `Không thể gửi email: ${error.message}`,
    };
  }
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
    <div style="background:linear-gradient(90deg,#ff71ce,#b967ff,#01cdfe);padding:4px 16px;">
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
          📧 Khiếu nại &amp; Liên hệ:
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
    <div style="background:linear-gradient(90deg,#05ffa1,#01cdfe,#b967ff);padding:4px 16px;">
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

// ══════════════════════════════════════════════════════════════
// 📖 HƯỚNG DẪN CẤU HÌNH GMAIL API
// ══════════════════════════════════════════════════════════════
//
// Cloudflare Workers không hỗ trợ SMTP trực tiếp, nên ta dùng
// Gmail REST API (qua fetch) — kết quả giống hệt smtp.gmail.com.
//
// === BƯỚC 1: Tạo Project trên Google Cloud Console ===
//   1. Truy cập: https://console.cloud.google.com
//   2. Tạo project mới (hoặc dùng project hiện có)
//   3. Vào "APIs & Services" → "Enable APIs" → Bật "Gmail API"
//
// === BƯỚC 2: Tạo OAuth 2.0 Credentials ===
//   1. Vào "APIs & Services" → "Credentials"
//   2. "Create Credentials" → "OAuth client ID"
//   3. Application type: "Web application"
//   4. Authorized redirect URIs: thêm https://developers.google.com/oauthplayground
//   5. Lưu lại: Client ID và Client Secret
//
// === BƯỚC 3: Lấy Refresh Token ===
//   1. Truy cập: https://developers.google.com/oauthplayground
//   2. Click ⚙️ (Settings) → Check "Use your own OAuth credentials"
//   3. Nhập Client ID và Client Secret từ Bước 2
//   4. Ở "Step 1": nhập scope: https://www.googleapis.com/auth/gmail.send
//   5. Click "Authorize APIs" → Đăng nhập bằng nongtiensonpro@gmail.com
//   6. Ở "Step 2": Click "Exchange authorization code for tokens"
//   7. Lưu lại: Refresh Token
//
// === BƯỚC 4: Thêm vào môi trường ===
//
//   Cho local (.dev.vars):
//     GMAIL_CLIENT_ID=xxxx.apps.googleusercontent.com
//     GMAIL_CLIENT_SECRET=GOCSPX-xxxxx
//     GMAIL_REFRESH_TOKEN=1//xxxxx
//     GMAIL_SENDER_EMAIL=nongtiensonpro@gmail.com
//
//   Cho production (Cloudflare):
//     npx wrangler secret put GMAIL_CLIENT_ID
//     npx wrangler secret put GMAIL_CLIENT_SECRET
//     npx wrangler secret put GMAIL_REFRESH_TOKEN
//     npx wrangler secret put GMAIL_SENDER_EMAIL
//
// ══════════════════════════════════════════════════════════════
