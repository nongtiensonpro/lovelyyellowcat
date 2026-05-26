/**
 * Email Notification Helper — Gửi email qua Gmail SMTP (App Password)
 *
 * Sử dụng smtp.gmail.com:465 (SSL) qua Cloudflare Workers TCP Sockets.
 * Đơn giản, ổn định, App Password không hết hạn.
 *
 * Cấu hình:
 *   - GMAIL_SENDER_EMAIL  → wrangler.jsonc vars (công khai)
 *   - GMAIL_APP_PASSWORD   → Cloudflare Secret hoặc .dev.vars (mật khẩu ứng dụng 16 ký tự)
 */

import { connect } from "cloudflare:sockets";

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
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;

// ── SMTP Client cho Cloudflare Workers ──

async function sendViaSmtp(params: {
  username: string;
  password: string;
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  let socket: ReturnType<typeof connect> | null = null;

  try {
    // Kết nối TLS tới smtp.gmail.com:465
    socket = connect(
      { hostname: SMTP_HOST, port: SMTP_PORT },
      { secureTransport: "on" }
    );

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    // Đọc response SMTP (hỗ trợ multi-line)
    async function readResponse(): Promise<{ code: number; text: string }> {
      while (true) {
        const { value, done } = await reader.read();
        if (done) throw new Error("SMTP: kết nối bị đóng đột ngột.");
        buffer += decoder.decode(value, { stream: true });

        // Response hoàn chỉnh khi có dòng bắt đầu bằng "XXX " (3 số + dấu cách)
        const lines = buffer.split("\r\n");
        for (let i = 0; i < lines.length; i++) {
          if (/^\d{3} /.test(lines[i])) {
            const code = parseInt(lines[i].substring(0, 3));
            const text = lines.slice(0, i + 1).join("\n");
            buffer = lines.slice(i + 1).join("\r\n");
            return { code, text };
          }
        }
      }
    }

    // Gửi lệnh SMTP và đọc response
    async function cmd(command: string): Promise<{ code: number; text: string }> {
      await writer.write(encoder.encode(command + "\r\n"));
      return readResponse();
    }

    // ── Luồng SMTP ──

    // 1. Đọc lời chào server (220)
    const greeting = await readResponse();
    if (greeting.code !== 220) throw new Error(`Greeting lỗi: ${greeting.text}`);

    // 2. EHLO
    const ehlo = await cmd("EHLO lovelyyellowcat");
    if (ehlo.code !== 250) throw new Error(`EHLO lỗi: ${ehlo.text}`);

    // 3. AUTH LOGIN
    const auth = await cmd("AUTH LOGIN");
    if (auth.code !== 334) throw new Error(`AUTH lỗi: ${auth.text}`);

    const userResp = await cmd(btoa(params.username));
    if (userResp.code !== 334) throw new Error(`Username bị từ chối: ${userResp.text}`);

    const passResp = await cmd(btoa(params.password));
    if (passResp.code !== 235) throw new Error(`Xác thực thất bại: ${passResp.text}`);

    // 4. MAIL FROM
    const mailFrom = await cmd(`MAIL FROM:<${params.username}>`);
    if (mailFrom.code !== 250) throw new Error(`MAIL FROM lỗi: ${mailFrom.text}`);

    // 5. RCPT TO
    const rcptTo = await cmd(`RCPT TO:<${params.to}>`);
    if (rcptTo.code !== 250) throw new Error(`RCPT TO lỗi: ${rcptTo.text}`);

    // 6. DATA
    const dataResp = await cmd("DATA");
    if (dataResp.code !== 354) throw new Error(`DATA lỗi: ${dataResp.text}`);

    // 7. Xây dựng MIME message
    const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`;
    const htmlBase64 = base64Chunked(params.html);

    const mimeMessage = [
      `From: ${SITE_NAME} <${params.username}>`,
      `To: ${params.to}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      htmlBase64,
      `.`,
    ].join("\r\n");

    // Gửi email body + dấu kết thúc "."
    const sendResult = await cmd(mimeMessage);
    if (sendResult.code !== 250) throw new Error(`Gửi email lỗi: ${sendResult.text}`);

    // 8. QUIT
    await cmd("QUIT").catch(() => {}); // Không cần check response QUIT

    writer.releaseLock();
    reader.releaseLock();

    console.log("[EMAIL] ✅ Email SMTP đã gửi thành công đến:", params.to);
    return {
      success: true,
      message: `Email thông báo đã được gửi đến ${params.to}.`,
    };
  } catch (error: any) {
    console.error("[EMAIL] ❌ SMTP error:", error.message);
    return {
      success: false,
      message: `Lỗi gửi email: ${error.message}`,
    };
  } finally {
    try { socket?.close(); } catch {}
  }
}

// ── Helper: Base64 chia thành dòng 76 ký tự (RFC 2045) ──

function base64Chunked(str: string, lineLength = 76): string {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += lineLength) {
    lines.push(b64.substring(i, i + lineLength));
  }
  return lines.join("\r\n");
}

// ── Hàm gửi email chính (wrapper) ──

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  runtimeEnv?: any;
}): Promise<EmailResult> {
  const senderEmail = params.runtimeEnv?.GMAIL_SENDER_EMAIL
    || import.meta.env.GMAIL_SENDER_EMAIL
    || CONTACT_EMAIL;

  const appPassword = params.runtimeEnv?.GMAIL_APP_PASSWORD
    || import.meta.env.GMAIL_APP_PASSWORD;

  if (!appPassword) {
    console.warn("[EMAIL] ⚠️ GMAIL_APP_PASSWORD chưa được cấu hình. Bỏ qua gửi email.");
    return {
      success: false,
      message: "Email chưa được gửi (GMAIL_APP_PASSWORD chưa cấu hình).",
    };
  }

  return sendViaSmtp({
    username: senderEmail,
    password: appPassword,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
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

// ══════════════════════════════════════════════════
// Template Email Cấm Tài Khoản
// ══════════════════════════════════════════════════

function buildBanEmailHtml(payload: BanEmailPayload): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border:2px solid #ff71ce;">
    <div style="background:linear-gradient(90deg,#ff71ce,#b967ff,#01cdfe);padding:4px 16px;">
      <span style="color:#fff;font-weight:bold;font-size:12px;font-family:'Courier New',monospace;">⚠️ SYSTEM_NOTIFICATION.EXE</span>
    </div>
    <div style="text-align:center;padding:32px 24px 16px;border-bottom:1px solid rgba(255,113,206,0.3);">
      <div style="font-size:48px;margin-bottom:8px;">🚫</div>
      <h1 style="color:#ff71ce;font-size:22px;font-weight:bold;margin:0;text-transform:uppercase;letter-spacing:3px;font-family:'Courier New',monospace;">
        Tài Khoản Bị Tạm Ngưng
      </h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Xin chào <strong style="color:#01cdfe;">${escapeHtml(payload.recipientName)}</strong>,
      </p>
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Chúng tôi thông báo rằng tài khoản của bạn trên <strong style="color:#fffb96;">${SITE_NAME}</strong>
        đã bị <span style="color:#ff4757;font-weight:bold;">tạm ngưng hoạt động</span> do vi phạm nội quy và quy định sử dụng của hệ thống.
      </p>
      <div style="background:rgba(255,71,87,0.1);border:1px solid rgba(255,71,87,0.4);border-left:4px solid #ff4757;padding:16px;margin:20px 0;">
        <p style="color:#ff6b81;font-size:12px;text-transform:uppercase;font-weight:bold;margin:0 0 6px;font-family:'Courier New',monospace;">📋 Lý do:</p>
        <p style="color:#e0e0e0;font-size:14px;line-height:1.5;margin:0;">${escapeHtml(payload.reason)}</p>
      </div>
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:16px 0;">
        Kể từ thời điểm này, bạn sẽ <strong>không thể đăng nhập</strong> hay sử dụng bất kỳ tính năng nào trên website,
        bao gồm: đăng bài viết, bình luận, gửi tranh, và các hoạt động khác.
      </p>
      <div style="background:rgba(1,205,254,0.1);border:1px solid rgba(1,205,254,0.3);border-left:4px solid #01cdfe;padding:16px;margin:20px 0;">
        <p style="color:#01cdfe;font-size:12px;text-transform:uppercase;font-weight:bold;margin:0 0 6px;font-family:'Courier New',monospace;">📧 Khiếu nại &amp; Liên hệ:</p>
        <p style="color:#e0e0e0;font-size:14px;line-height:1.5;margin:0;">
          Nếu bạn cho rằng đây là nhầm lẫn hoặc muốn trao đổi thêm, vui lòng liên hệ:
        </p>
        <p style="margin:8px 0 0;">
          <a href="mailto:${escapeHtml(payload.contactEmail)}" style="color:#fffb96;font-size:16px;font-weight:bold;text-decoration:underline;">${escapeHtml(payload.contactEmail)}</a>
        </p>
      </div>
      <p style="color:#999;font-size:13px;line-height:1.5;margin:20px 0 0;">
        Chúng tôi luôn sẵn sàng lắng nghe và xem xét lại quyết định nếu có cơ sở hợp lý.
      </p>
    </div>
    <div style="border-top:1px solid rgba(255,113,206,0.2);padding:16px 28px;text-align:center;">
      <p style="color:#666;font-size:11px;margin:0;font-family:'Courier New',monospace;">${SITE_NAME} — AESTHETIC_SYSTEM v2.0</p>
      <p style="color:#555;font-size:10px;margin:4px 0 0;">Email này được gửi tự động. Vui lòng không phản hồi trực tiếp.</p>
    </div>
  </div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════
// Template Email Gỡ Cấm Tài Khoản
// ══════════════════════════════════════════════════

function buildUnbanEmailHtml(payload: UnbanEmailPayload): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border:2px solid #05ffa1;">
    <div style="background:linear-gradient(90deg,#05ffa1,#01cdfe,#b967ff);padding:4px 16px;">
      <span style="color:#fff;font-weight:bold;font-size:12px;font-family:'Courier New',monospace;">✅ SYSTEM_NOTIFICATION.EXE</span>
    </div>
    <div style="text-align:center;padding:32px 24px 16px;border-bottom:1px solid rgba(5,255,161,0.3);">
      <div style="font-size:48px;margin-bottom:8px;">🎉</div>
      <h1 style="color:#05ffa1;font-size:22px;font-weight:bold;margin:0;text-transform:uppercase;letter-spacing:3px;font-family:'Courier New',monospace;">
        Tài Khoản Đã Được Khôi Phục
      </h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Xin chào <strong style="color:#01cdfe;">${escapeHtml(payload.recipientName)}</strong>,
      </p>
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Chúng tôi vui mừng thông báo rằng tài khoản của bạn trên <strong style="color:#fffb96;">${SITE_NAME}</strong>
        đã được <span style="color:#05ffa1;font-weight:bold;">khôi phục hoạt động</span>.
      </p>
      <div style="background:rgba(5,255,161,0.1);border:1px solid rgba(5,255,161,0.3);border-left:4px solid #05ffa1;padding:16px;margin:20px 0;">
        <p style="color:#05ffa1;font-size:12px;text-transform:uppercase;font-weight:bold;margin:0 0 6px;font-family:'Courier New',monospace;">🟢 Trạng thái tài khoản:</p>
        <p style="color:#e0e0e0;font-size:14px;line-height:1.5;margin:0;">
          Tài khoản của bạn hiện đã <strong style="color:#05ffa1;">HOẠT ĐỘNG</strong>.
          Bạn có thể đăng nhập lại bằng tài khoản Google và sử dụng tất cả các tính năng trên website.
        </p>
      </div>
      <p style="color:#e0e0e0;font-size:15px;line-height:1.6;margin:16px 0;">
        Hãy đảm bảo tuân thủ nội quy cộng đồng để có trải nghiệm tốt nhất nhé!
      </p>
      <div style="background:rgba(1,205,254,0.1);border:1px solid rgba(1,205,254,0.3);border-left:4px solid #01cdfe;padding:16px;margin:20px 0;">
        <p style="color:#01cdfe;font-size:12px;text-transform:uppercase;font-weight:bold;margin:0 0 6px;font-family:'Courier New',monospace;">📧 Hỗ trợ:</p>
        <p style="color:#e0e0e0;font-size:14px;line-height:1.5;margin:0;">
          Nếu có thắc mắc, vui lòng liên hệ:
          <a href="mailto:${escapeHtml(payload.contactEmail)}" style="color:#fffb96;font-weight:bold;text-decoration:underline;">${escapeHtml(payload.contactEmail)}</a>
        </p>
      </div>
      <p style="color:#b967ff;font-size:14px;font-weight:bold;text-align:center;margin:24px 0 0;">
        ✨ Chào mừng bạn trở lại với ${SITE_NAME}! ✨
      </p>
    </div>
    <div style="border-top:1px solid rgba(5,255,161,0.2);padding:16px 28px;text-align:center;">
      <p style="color:#666;font-size:11px;margin:0;font-family:'Courier New',monospace;">${SITE_NAME} — AESTHETIC_SYSTEM v2.0</p>
      <p style="color:#555;font-size:10px;margin:4px 0 0;">Email này được gửi tự động. Vui lòng không phản hồi trực tiếp.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Hàm public ──

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
